import { Action, ActionPanel, getSelectedText, Icon, List, useNavigation } from "@raycast/api";
import { useEffect, useMemo, useRef } from "react";
import { toRunFailure } from "../commands/failure";
import { collectInput, frontmostAppId } from "../commands/input";
import type { PromptDef } from "../core/types";
import { extractRequirements } from "../prompts/template/render";
import { showError } from "./feedback";
import { resolveIcon } from "./icons";
import { RunSession } from "./run-session";
import { StoreRecovery } from "./store-recovery";
import { usePrompts } from "./use-prompts";

/** Lists active prompts, most recently used first. */
export function PromptPicker() {
  const { prompts, isLoading, error, reload } = usePrompts();
  const { push } = useNavigation();
  // Read early, while the source app is certain to be in front. Used only if the chosen prompt needs it.
  const selection = useRef<Promise<string>>(undefined);
  const sourceApp = useRef<Promise<string | undefined>>(undefined);

  useEffect(() => {
    sourceApp.current = frontmostAppId();
    selection.current = getSelectedText();
    selection.current.catch(() => undefined);
  }, []);

  const active = useMemo(
    () => prompts.filter((prompt) => prompt.enabled).sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0)),
    [prompts],
  );

  async function run(prompt: PromptDef) {
    try {
      const input = await collectInput(extractRequirements(prompt.template), {
        selectionReader: () => selection.current ?? getSelectedText(),
        sourceAppReader: () => sourceApp.current ?? frontmostAppId(),
      });
      push(<RunSession prompt={prompt} input={input} navigationTitle={prompt.name} />);
    } catch (cause) {
      const failure = toRunFailure(cause);
      await showError(failure.title, failure);
    }
  }

  if (error) return <StoreRecovery error={error} onRecovered={reload} />;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search prompts">
      {active.map((prompt) => (
        <List.Item
          key={prompt.id}
          icon={resolveIcon(prompt.icon)}
          title={prompt.name}
          keywords={prompt.tags}
          accessories={prompt.tags.map((tag) => ({ tag }))}
          actions={
            <ActionPanel>
              <Action title="Run Prompt" icon={Icon.Play} onAction={() => run(prompt)} />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && <List.EmptyView title="No Active Prompts" description="Create one in Manage Prompts." />}
    </List>
  );
}
