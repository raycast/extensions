import { Clipboard, confirmAlert, showHUD, showInFinder } from "@raycast/api";
import { refreshHotIndex } from "./lib/hot-index";

export default async function Command() {
  const { count, directory } = await refreshHotIndex();
  await Clipboard.copy(directory);
  await showInFinder(directory);

  await confirmAlert({
    title: "Lark Hot Index Ready",
    message: [
      `Generated ${count} Script Commands in:`,
      directory,
      "",
      "Add this folder once in Raycast:",
      "Raycast Settings > Extensions > Script Commands > Add Directories",
      "",
      "After that, Root Search can find high-frequency Lark items by their original Lark titles.",
      "Run `Refresh Lark Hot Index` anytime to rebuild the local index.",
      "",
      "Requirements:",
      "lark-cli >= 1.0.53",
      "Minimum scopes for Lark Search:",
      "search:docs:read search:message im:chat:read contact:user.base:readonly",
      "Optional scopes for pinned chats and flagged messages in Hot Index:",
      "im:feed.shortcut:read im:feed.flag:read",
      "",
      "Check scopes with:",
      'lark-cli auth check --scope "search:docs:read search:message im:chat:read contact:user.base:readonly"',
      "The folder path has been copied.",
    ].join("\n"),
    primaryAction: { title: "Got It" },
  });

  await showHUD("Lark hot index folder path copied.");
}
