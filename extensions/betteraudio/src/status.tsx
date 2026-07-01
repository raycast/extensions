import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getStatus } from "./lib/cli";
import { ErrorView } from "./components/ErrorView";

export default function Command() {
  const {
    data: status,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(getStatus);

  if (error) return <ErrorView error={error} />;

  const outputName = status?.outputDevice?.name ?? "—";
  const inputName = status?.inputDevice?.name ?? "—";
  const vol = status ? `${Math.round(status.outputVolume)}%` : "—";
  const muted = status?.isMuted ? "Yes" : "No";
  const silent = status?.isSilentMode ? "On" : "Off";
  const apps = status ? String(status.activeAppCount) : "—";
  const cliInstalled = status?.cliInstalled ? "Yes" : "No";

  const markdown = `# BetterAudio ${status?.version ? `v${status.version}` : ""}

| | |
|---|---|
| **Running** | ${status?.isRunning ? "✅ Yes" : "❌ No"} |
| **Output Device** | ${outputName} |
| **Input Device** | ${inputName} |
| **Volume** | ${vol} |
| **Muted** | ${muted} |
| **Silent Mode** | ${silent} |
| **Active Apps** | ${apps} |
| **CLI Installed** | ${cliInstalled} |
`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
          />
          <Action.Open
            title="Open BetterAudio"
            target="/Applications/BetterAudio.app"
          />
        </ActionPanel>
      }
    />
  );
}
