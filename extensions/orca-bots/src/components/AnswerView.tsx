import { Action, ActionPanel, Detail, Icon, Keyboard, Toast, closeMainWindow, showToast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { type Bot, extractSessionId, launchArgs } from "../lib/bots";
import { type Conversation, isAnswered, latestError, latestReply, parseConversation } from "../lib/conversation";
import { quote } from "../lib/markdown";
import { OrcaCliError, runOrca } from "../lib/orca-cli";
import { getOrcaPath } from "../lib/preferences";
import { openOrca } from "./OrcaGuard";

/** Met Orca au premier plan, puis ferme Raycast ; un échec d'ouverture garde Raycast ouvert avec son toast. */
async function openOrcaAndClose(): Promise<void> {
  if (await openOrca()) {
    await closeMainWindow();
  }
}

const POLL_INTERVAL_MS = 1_500;
const MAX_WAIT_MS = 10 * 60 * 1_000;
/** Échecs de lecture consécutifs tolérés avant d'abandonner (un hoquet de la CLI ne doit pas tuer l'attente). */
const MAX_READ_FAILURES = 3;

type Phase = "waiting" | "answered" | "ended" | "terminal" | "timeout" | "error";

type Props = {
  bot: Bot;
  prompt: string;
  /** Ouvre un nouveau formulaire pour le même bot. Sans ce rappel, l'action n'est pas proposée. */
  onAskAgain?: () => void;
};

/**
 * Lance le prompt sans jamais mettre Orca au premier plan (pas de --focus) et renvoie l'ID de session.
 * `null` : le lancement a réussi mais sans session de chat lisible (repli terminal).
 */
async function launchPrompt(bot: Bot, prompt: string): Promise<string | null> {
  return extractSessionId(await runOrca<unknown>(launchArgs(bot, prompt), { orcaPath: getOrcaPath() }));
}

const describeError = (error: unknown): string =>
  error instanceof OrcaCliError
    ? `${error.message} (${error.code})`
    : error instanceof Error
      ? error.message
      : String(error);

export function AnswerView({ bot, prompt, onAskAgain }: Props) {
  const [phase, setPhase] = useState<Phase>("waiting");
  const [reply, setReply] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Erreur remontée par le bot lui-même (entrée `error` de la conversation).
  const [botError, setBotError] = useState<string | null>(null);
  // Incrémenté par « Relire la réponse » : rejoue la lecture sur la même session, sans relancer le prompt.
  const [attempt, setAttempt] = useState(0);

  // Une seule sollicitation par montage, même si l'effet est rejoué (double montage React, relecture).
  const launchRef = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();
    let readFailures = 0;

    const fail = (title: string, error: unknown) => {
      if (cancelled) return;
      setErrorMessage(describeError(error));
      setPhase("error");
      void showToast({ style: Toast.Style.Failure, title, message: describeError(error) });
    };

    // Lectures enchaînées (jamais deux en vol) : la suivante n'est planifiée qu'une fois la précédente terminée.
    const poll = async (id: string) => {
      let conversation: Conversation;
      try {
        conversation = parseConversation(await runOrca<unknown>(["agent", "read", id], { orcaPath: getOrcaPath() }));
        readFailures = 0;
      } catch (error) {
        if (cancelled) return;
        readFailures += 1;
        if (readFailures >= MAX_READ_FAILURES) {
          fail("Failed to Read Reply", error);
          return;
        }
        timer = setTimeout(() => void poll(id), POLL_INTERVAL_MS);
        return;
      }
      if (cancelled) return;

      if (isAnswered(conversation)) {
        setReply(latestReply(conversation));
        setPhase("answered");
        return;
      }
      setBotError(latestError(conversation));
      // Tour terminé sans réponse exploitable : inutile d'attendre davantage.
      if (conversation.state === "done") {
        setPhase("ended");
        return;
      }
      if (Date.now() - startedAt >= MAX_WAIT_MS) {
        setPhase("timeout");
        return;
      }
      timer = setTimeout(() => void poll(id), POLL_INTERVAL_MS);
    };

    launchRef.current ??= launchPrompt(bot, prompt);
    launchRef.current.then(
      (id) => {
        if (cancelled) return;
        if (id === null) {
          setPhase("terminal");
          return;
        }
        setSessionId(id);
        void poll(id);
      },
      (error) => fail("Failed to Send Prompt", error),
    );

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [attempt]);

  const reread = () => {
    setErrorMessage(null);
    setPhase("waiting");
    setAttempt((current) => current + 1);
  };

  let body: string;
  switch (phase) {
    case "answered":
      body = reply ?? "";
      break;
    case "ended":
      body = botError
        ? `**Error**\n\n${quote(botError)}`
        : `*${bot.name} did not reply. Open its chats in Orca to see what happened.*`;
      break;
    case "terminal":
      body = `*Prompt sent, but ${bot.name} is running in a terminal: its reply will appear in Orca.*`;
      break;
    case "timeout":
      body = `*Still working. The reply will arrive in ${bot.name}'s chats in Orca.*`;
      break;
    case "error":
      body = quote(`Failed: ${errorMessage ?? "unknown error"}`);
      break;
    default:
      body = botError ? `**Error**\n\n${quote(botError)}` : `*${bot.name} is thinking…*`;
  }

  const canReread = sessionId !== null && (phase === "error" || phase === "timeout");

  return (
    <Detail
      navigationTitle={bot.name}
      isLoading={phase === "waiting"}
      markdown={`${quote(prompt)}\n\n${body}`}
      actions={
        <ActionPanel>
          {/* Action principale : aller voir dans Orca. La CLI ne sait pas cibler un chat de bot
              (`terminal switch` refuse son handle : terminal_handle_stale), donc on ouvre Orca sans ciblage. */}
          <Action title="Open Orca" icon={Icon.AppWindow} onAction={openOrcaAndClose} />
          {phase === "answered" && reply !== null && (
            <>
              <Action.CopyToClipboard title="Copy Reply" content={reply} />
              <Action.Paste title="Paste Reply" content={reply} />
            </>
          )}
          {canReread && <Action title="Retry Reading Reply" icon={Icon.ArrowClockwise} onAction={reread} />}
          {onAskAgain && (
            <Action
              title={`New Question for ${bot.name}`}
              icon={Icon.Message}
              shortcut={Keyboard.Shortcut.Common.New}
              onAction={onAskAgain}
            />
          )}
          {sessionId && (
            <Action.CopyToClipboard
              title="Copy Session ID"
              content={sessionId}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
