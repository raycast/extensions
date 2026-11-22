import { Action, ActionPanel, Detail, Icon, Keyboard, closeMainWindow } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { type Bot, extractSessionId, launchArgs } from "../lib/bots";
import {
  type Conversation,
  isAnswered,
  latestError,
  latestReply,
  mergeFragments,
  parseConversation,
} from "../lib/conversation";
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

type PollState = {
  phase: "waiting" | "answered" | "ended" | "timeout" | "error";
  reply: string | null;
  botError: string | null;
  errorMessage: string | null;
};

type Props = {
  bot: Bot;
  prompt: string;
  /** Titre de navigation à ne renseigner que lorsque la vue est poussée sur la pile (jamais en vue racine). */
  navigationTitle?: string;
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

async function readMergedConversation(id: string): Promise<Conversation> {
  const conversation = parseConversation(await runOrca<unknown>(["agent", "read", id], { orcaPath: getOrcaPath() }));
  return { ...conversation, entries: mergeFragments(conversation.entries) };
}

const describeError = (error: unknown): string =>
  error instanceof OrcaCliError
    ? `${error.message} (${error.code})`
    : error instanceof Error
      ? error.message
      : String(error);

export function AnswerView({ bot, prompt, navigationTitle, onAskAgain }: Props) {
  const [pollState, setPollState] = useState<PollState>({
    phase: "waiting",
    reply: null,
    botError: null,
    errorMessage: null,
  });

  // Une seule sollicitation par montage, même si le hook est rejoué.
  const launchRef = useRef<Promise<string | null> | null>(null);
  const startedAtRef = useRef(Date.now());
  const readFailuresRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pollRevalidateRef = useRef<() => void>(() => {});

  const {
    data: launchResult,
    error: launchError,
    isLoading: isLaunching,
  } = usePromise(
    async () => {
      launchRef.current ??= launchPrompt(bot, prompt);
      return launchRef.current;
    },
    [],
    {
      onData: () => {
        startedAtRef.current = Date.now();
      },
      failureToastOptions: { title: "Failed to Send Prompt" },
    },
  );

  const sessionId = typeof launchResult === "string" ? launchResult : null;

  // Lectures enchaînées (jamais deux en vol) : la suivante n'est planifiée qu'une fois la précédente terminée.
  const { revalidate: revalidateRead } = usePromise(readMergedConversation, [sessionId ?? ""], {
    execute: sessionId !== null,
    onData: (conversation) => {
      readFailuresRef.current = 0;
      if (isAnswered(conversation)) {
        setPollState({
          phase: "answered",
          reply: latestReply(conversation),
          botError: null,
          errorMessage: null,
        });
        return;
      }
      const nextBotError = latestError(conversation);
      // Tour terminé sans réponse exploitable : inutile d'attendre davantage.
      if (conversation.state === "done") {
        setPollState({ phase: "ended", reply: null, botError: nextBotError, errorMessage: null });
        return;
      }
      if (Date.now() - startedAtRef.current >= MAX_WAIT_MS) {
        setPollState({ phase: "timeout", reply: null, botError: nextBotError, errorMessage: null });
        return;
      }
      setPollState((current) => (current.botError === nextBotError ? current : { ...current, botError: nextBotError }));
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => pollRevalidateRef.current(), POLL_INTERVAL_MS);
    },
    onError: (error) => {
      readFailuresRef.current += 1;
      if (readFailuresRef.current >= MAX_READ_FAILURES) {
        setPollState({ phase: "error", reply: null, botError: null, errorMessage: describeError(error) });
        void showFailureToast(error, { title: "Failed to Read Reply" });
        return;
      }
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => pollRevalidateRef.current(), POLL_INTERVAL_MS);
    },
  });

  useEffect(() => {
    pollRevalidateRef.current = revalidateRead;
  }, [revalidateRead]);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const reread = () => {
    clearTimeout(timerRef.current);
    startedAtRef.current = Date.now();
    readFailuresRef.current = 0;
    setPollState({ phase: "waiting", reply: null, botError: null, errorMessage: null });
    revalidateRead();
  };

  let phase: Phase;
  if (launchError) {
    phase = "error";
  } else if (isLaunching) {
    phase = "waiting";
  } else if (launchResult === null) {
    phase = "terminal";
  } else {
    phase = pollState.phase;
  }

  const reply = pollState.reply;
  const botError = pollState.botError;
  const errorMessage = launchError ? describeError(launchError) : pollState.errorMessage;

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
      navigationTitle={navigationTitle}
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
