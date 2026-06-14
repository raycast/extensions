import { Clipboard, confirmAlert, showHUD, showInFinder } from "@raycast/api";
import { refreshHotIndex } from "./lib/hot-index";

export default async function Command() {
  const { count, directory } = await refreshHotIndex();
  await Clipboard.copy(directory);
  await showInFinder(directory);

  await confirmAlert({
    title: "Lark Root Search Ready",
    message: [
      `Generated ${count} shortcut files in:`,
      directory,
      "",
      "To use these from Raycast Root Search, add this folder once in Raycast:",
      "Raycast Settings > Extensions > Script Commands > Add Directories",
      "",
      "After that, Root Search can find high-frequency Lark items by their original Lark titles.",
      "Run `Refresh Lark Root Search` anytime to rebuild the local shortcuts.",
      "",
      "Requirements:",
      "Lark-cli >= 1.0.53",
      "",
      "Application preferences:",
      "Choose Application Target: Lark, Feishu, or Feishu and Lark.",
      "Bundle IDs are built in and do not need manual configuration.",
      "Use Lark-cli Identity fields only if Lark and Feishu use different lark-cli --as accounts.",
      "",
      "Minimum scopes for Lark Search:",
      "search:docs:read search:message im:chat:read contact:user.base:readonly",
      "Optional scopes for pinned chats and flagged messages in Root Search:",
      "im:feed.shortcut:read im:feed.flag:read",
      "",
      "Check scopes with:",
      'lark-cli auth check --scope "search:docs:read search:message im:chat:read contact:user.base:readonly"',
      "The folder path has been copied and opened in Finder. You can change it later with the Root Search Shortcut Folder preference.",
    ].join("\n"),
    primaryAction: { title: "Got It" },
  });

  await showHUD("Lark Root Search folder path copied.");
}
