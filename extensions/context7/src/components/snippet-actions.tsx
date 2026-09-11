import { AI, Action, ActionPanel, Detail, Icon, Keyboard, environment, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";

import { isAbortError, showErrorToast, toErrorMessage } from "../lib/error-utils";
import type { ContextSnippet } from "../lib/types";

/**
 * Copy and paste live in their own section, separated from the save and navigation actions —
 * they are the "take this away with me" group and the ones reached by muscle memory.
 */
export function SnippetClipboardActions(props: { snippet: ContextSnippet; markdown: string }) {
  const { snippet, markdown } = props;

  return (
    <ActionPanel.Section>
      <Action.CopyToClipboard title="Copy to Clipboard" content={markdown} />
      <Action.Paste
        content={markdown}
        shortcut={{
          macOS: { modifiers: ["cmd"], key: "return" },
          Windows: { modifiers: ["ctrl"], key: "return" },
        }}
      />
      <AskAiAction snippet={snippet} markdown={markdown} />
    </ActionPanel.Section>
  );
}

/**
 * Raycast AI is a Pro feature, so the action is omitted entirely rather than offered and then
 * failing — an ungated AI call is the defect the house rule exists to prevent.
 */
function AskAiAction(props: { snippet: ContextSnippet; markdown: string }) {
  const { snippet, markdown } = props;
  const { push } = useNavigation();

  if (!environment.canAccess(AI)) {
    return null;
  }

  return (
    <Action
      title="Ask Raycast AI"
      icon={Icon.Stars}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "a" },
        Windows: { modifiers: ["ctrl", "shift"], key: "a" },
      }}
      onAction={() => push(<AskAiDetail snippet={snippet} markdown={markdown} />)}
    />
  );
}

function AskAiDetail(props: { snippet: ContextSnippet; markdown: string }) {
  const { snippet, markdown } = props;
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;
    // Leaving the view must stop the request, not just ignore it — an in-flight AI call is
    // billable work the user has already navigated away from.
    const abortController = new AbortController();

    void (async () => {
      try {
        const stream = AI.ask(
          [
            "Explain this documentation snippet for a developer who is about to use it.",
            "Cover what it does, when to reach for it, and any pitfall worth knowing.",
            "Be concise. Do not repeat the code verbatim.",
            "",
            markdown,
          ].join("\n"),
          { signal: abortController.signal },
        );

        // Streamed so the view fills progressively instead of sitting blank on a long answer.
        stream.on("data", (chunk) => {
          if (isCurrent) {
            setAnswer((current) => current + chunk);
          }
        });

        await stream;
      } catch (error) {
        if (isCurrent && !isAbortError(error)) {
          setAnswer(`# Error\n\n${toErrorMessage(error)}`);
          await showErrorToast("Raycast AI Could Not Answer", error);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isCurrent = false;
      abortController.abort();
    };
  }, [markdown]);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={snippet.title}
      markdown={answer || "Asking Raycast AI…"}
      actions={
        answer ? (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Answer" content={answer} />
            <Action.CopyToClipboard title="Copy Snippet" content={markdown} shortcut={Keyboard.Shortcut.Common.Copy} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
