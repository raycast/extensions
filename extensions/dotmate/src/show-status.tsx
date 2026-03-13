import { Detail } from "@raycast/api";
import { DOTFILES } from "./dotfiles";
import { getFileStatus } from "./utils";

export default function Command() {
  const generateStatusMarkdown = () => {
    let markdown = "# 📋 Dotfiles Status\n\n";

    for (const dotfile of DOTFILES) {
      const status = getFileStatus(dotfile);

      markdown += `## ${status} ${dotfile.name}\n\n`;
      markdown += `**Repo Path:** \`${dotfile.repoPath}\`  \n`;
      markdown += `**Home Path:** \`${dotfile.homePath}\`  \n`;

      let statusText = "";
      if (status === "✅") {
        statusText = "Files are identical";
      } else if (status === "🔄") {
        statusText = "Files differ";
      } else if (status === "📥") {
        statusText = "Only exists in repo";
      } else if (status === "📤") {
        statusText = "Only exists in home";
      } else if (status === "❌") {
        statusText = "Missing from both locations";
      }

      markdown += `**Status:** ${statusText}\n\n`;
      markdown += "---\n\n";
    }

    markdown += "## Legend\n\n";
    markdown += "- ✅ Files are identical\n";
    markdown += "- 🔄 Files differ\n";
    markdown += "- 📥 Only exists in repo\n";
    markdown += "- 📤 Only exists in home\n";
    markdown += "- ❌ Missing from both locations\n";

    return markdown;
  };

  return <Detail markdown={generateStatusMarkdown()} />;
}
