import type { LaunchProps } from "@raycast/api";
import { PromptAgentForm } from "./components/prompt-agent-form";
import { useHerdrSnapshot } from "./hooks/use-herdr-snapshot";
import { ErrorView } from "./lib/ui";

type Props = LaunchProps<{ arguments: Arguments.PromptAgent; launchContext: { paneId?: string } }>;

export default function Command(props: Props) {
  const snapshot = useHerdrSnapshot();
  if (snapshot.error && !snapshot.data) return <ErrorView error={snapshot.error} onRetry={snapshot.revalidate} />;
  return (
    <PromptAgentForm
      agents={snapshot.data?.agents || []}
      initialAgentId={props.launchContext?.paneId}
      initialPrompt={props.arguments.prompt || ""}
      onSent={snapshot.revalidate}
    />
  );
}
