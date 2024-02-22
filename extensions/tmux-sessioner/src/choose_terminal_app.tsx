import { LaunchProps, LaunchType, launchCommand } from "@raycast/api";
import { SelectTerminalApp } from "./SelectTerminalApp";

export default function ChooseTerminalApp({
  launchContext,
}: LaunchProps<{ launchContext: { launcherCommand?: string } }>) {
  const launcherCommand = launchContext?.launcherCommand;
  if (!launcherCommand) {
    return <SelectTerminalApp />;
  }
  return (
    <SelectTerminalApp
      setIsTerminalSetup={(value) => {
        if (!value) {
          return;
        }
        launchCommand({
          type: LaunchType.UserInitiated,
          name: launcherCommand,
          extensionName: "tmux-sessioner",
          ownerOrAuthorName: "louishuyng",
        });
      }}
    />
  );
}
