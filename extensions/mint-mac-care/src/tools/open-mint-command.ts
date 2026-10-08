import { LaunchType, launchCommand } from "@raycast/api";

const COMMANDS = {
  "free-disk": { name: "mint-scan", title: "Free Disk" },
  "optimize-storage": { name: "mint-optimize", title: "Optimize Storage" },
  "free-memory": { name: "mint-memory", title: "Free Memory" },
  "organize-folder": { name: "mint-organize", title: "Organize a Folder" },
  "uninstall-app": { name: "mint-uninstall", title: "Uninstall App" },
  "disk-growth": { name: "mint-why", title: "Show Disk Growth" },
  status: { name: "mint-status", title: "View Mac Status" },
} as const;

type Input = {
  /**
   * Which Mint command to open: free-disk to clean caches, build output and chosen files; optimize-storage to make
   * identical copies share storage without deleting anything; free-memory to quit idle apps; organize-folder to sort a
   * folder's loose files; uninstall-app to remove an app and its leftovers; disk-growth for what grew this week;
   * status for disk and memory at a glance.
   */
  command: keyof typeof COMMANDS;
};

/**
 * Opens one of Mint's commands in Raycast so the person can see what it would do and confirm it there. Nothing is
 * removed, quit or moved by this tool itself.
 */
export default async function tool({ command }: Input) {
  const target = COMMANDS[command];
  if (!target) throw new Error(`Unknown Mint command: ${command}`);
  await launchCommand({ name: target.name, type: LaunchType.UserInitiated });
  return `Opened ${target.title}. Nothing has changed yet: the person reviews it there and confirms.`;
}
