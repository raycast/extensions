import { launchCommand, LaunchType } from "@raycast/api";

type Input = {
  /** Which Mole command to open: clean for caches and logs, purge for development artifacts, installer for installer files, uninstall for an app, or optimize for system maintenance. */
  command: "clean" | "purge" | "installer" | "uninstall" | "optimize";
};

export default async function openCleanup({ command }: Input) {
  if (!["clean", "purge", "installer", "uninstall", "optimize"].includes(command)) {
    throw new Error(`Unknown cleanup command: ${command}`);
  }

  await launchCommand({ name: command, type: LaunchType.UserInitiated });
  return `Opened ${command} in Raycast. Review the preview and confirm the cleanup there.`;
}
