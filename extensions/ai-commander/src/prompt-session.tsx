import { Detail, type LaunchProps } from "@raycast/api";
import { useMemo } from "react";
import { acceptSessionContext } from "./commands/session-context";
import type { SessionContext } from "./commands/input";
import { hasAnyApiKey } from "./core/preferences";
import { PromptPicker } from "./ui/prompt-picker";
import { RunSession } from "./ui/run-session";
import { SetupView } from "./ui/setup-view";
import { StoreRecovery } from "./ui/store-recovery";
import { usePrompts } from "./ui/use-prompts";

const PROMPT_NOT_FOUND = "## Prompt Not Found\n\nIt may have been deleted. Check Manage Prompts.";

function ContextSession({ context }: { context: SessionContext }) {
  const { prompts, isLoading, error, reload } = usePrompts();

  if (error) return <StoreRecovery error={error} onRecovered={reload} />;
  if (isLoading) return <Detail isLoading markdown="" />;
  const prompt = prompts.find((entry) => entry.id === context.promptId);
  if (!prompt) return <Detail markdown={PROMPT_NOT_FOUND} />;
  return (
    <RunSession prompt={prompt} input={context.input} initialArgs={context.args} forcePreview={context.forcePreview} />
  );
}

/**
 * Without context this is the prompt list; with context it continues a run started by `run-prompt`. The key gives every
 * launch its own view state, so a new launch can never show the result of the one before.
 */
export default function Command(props: LaunchProps<{ launchContext: Record<string, unknown> }>) {
  const raw = props.launchContext;
  const context = useMemo(() => acceptSessionContext(raw), [raw?.launchId]);
  if (context) return <ContextSession key={context.launchId} context={context} />;
  return hasAnyApiKey() ? <PromptPicker /> : <SetupView />;
}
