import { Detail } from "@raycast/api";
import { existsSync, readFileSync } from "fs";
import { useState, useEffect } from "react";
import { DOTFILES } from "./dotfiles";

function createSideBySideDiff(
  repoContent: string,
  homeContent: string,
  fileName: string,
): string {
  const repoLines = repoContent.split("\n");
  const homeLines = homeContent.split("\n");

  const maxLines = Math.max(repoLines.length, homeLines.length);
  let foundDifferences = false;
  let diffOutput = "";

  // Find diff sections with context
  let currentSection: { start: number; end: number } | null = null;
  const contextLines = 3;
  const diffSections: { start: number; end: number }[] = [];

  for (let i = 0; i < maxLines; i++) {
    const repoLine = repoLines[i] || "";
    const homeLine = homeLines[i] || "";

    if (repoLine !== homeLine) {
      foundDifferences = true;
      if (!currentSection) {
        currentSection = { start: Math.max(0, i - contextLines), end: i };
      }
      currentSection.end = Math.min(maxLines - 1, i + contextLines);
    } else if (currentSection && i > currentSection.end) {
      // End current section
      diffSections.push(currentSection);
      currentSection = null;
    }
  }

  // Handle last section
  if (currentSection) {
    diffSections.push(currentSection);
  }

  if (!foundDifferences) return "";

  diffOutput += `## 📄 ${fileName}\n\n`;

  // Create sections for each diff area
  diffSections.forEach((section, sectionIndex) => {
    if (sectionIndex > 0) {
      diffOutput += "\n---\n\n";
    }

    diffOutput += `**Lines ${section.start + 1}-${section.end + 1}:**\n\n`;
    diffOutput += "| 🏠 Home Version | 📦 Repo Version |\n";
    diffOutput += "|-----------------|------------------|\n";

    for (let i = section.start; i <= section.end; i++) {
      const repoLine = repoLines[i] || "";
      const homeLine = homeLines[i] || "";
      const lineNum = i + 1;

      // Escape markdown special characters but preserve line content
      const escapedHomeLine = escapeMarkdown(homeLine);
      const escapedRepoLine = escapeMarkdown(repoLine);

      if (repoLine === homeLine) {
        // Unchanged line - show line number within code block
        diffOutput += `| \`${lineNum}: ${escapedHomeLine}\` | \`${lineNum}: ${escapedRepoLine}\` |\n`;
      } else {
        // Changed line - use standard diff format with - and +
        if (homeLine && repoLine) {
          // Both have content but different
          diffOutput += `| \`- ${lineNum}: ${escapedHomeLine}\` | \`+ ${lineNum}: ${escapedRepoLine}\` |\n`;
        } else if (homeLine && !repoLine) {
          // Only in home (removed from repo)
          diffOutput += `| \`- ${lineNum}: ${escapedHomeLine}\` |  |\n`;
        } else if (!homeLine && repoLine) {
          // Only in repo (added to repo)
          diffOutput += `|  | \`+ ${lineNum}: ${escapedRepoLine}\` |\n`;
        }
      }
    }
    diffOutput += "\n";
  });

  diffOutput += "---\n\n";
  return diffOutput;
}

function escapeMarkdown(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/`/g, "\\`")
    .replace(/\*/g, "\\*")
    .replace(/_/g, "\\_")
    .replace(/~/g, "\\~")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/#/g, "\\#")
    .replace(/\+/g, "\\+")
    .replace(/-/g, "\\-")
    .replace(/!/g, "\\!")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [markdown, setMarkdown] = useState<string>("");

  useEffect(() => {
    generateDiffMarkdown();
  }, []);

  const generateDiffMarkdown = () => {
    setIsLoading(true);
    let markdown = "# 🔍 Dotfiles Differences\n\n";
    let foundAnyDifferences = false;

    for (const dotfile of DOTFILES) {
      const repoExists = existsSync(dotfile.repoPath);
      const homeExists = existsSync(dotfile.homePath);

      if (!repoExists || !homeExists) {
        foundAnyDifferences = true;
        markdown += `## ⚠️ File Missing: ${dotfile.name}\n\n`;
        if (!repoExists) {
          markdown += `> 📦 \`${dotfile.repoPath}\` does not exist in the repository.\n`;
        }
        if (!homeExists) {
          markdown += `> 🏠 \`${dotfile.homePath}\` does not exist in the home directory.\n`;
        }
        markdown += "---\n\n";
        continue;
      }

      try {
        const repoContent = readFileSync(dotfile.repoPath, "utf8");
        const homeContent = readFileSync(dotfile.homePath, "utf8");

        if (repoContent !== homeContent) {
          foundAnyDifferences = true;
          markdown += "*Side-by-side comparison of your dotfiles*\n\n";
          const diffOutput = createSideBySideDiff(
            repoContent,
            homeContent,
            dotfile.name,
          );
          if (diffOutput) {
            markdown += `> **📍 File paths:**\n`;
            markdown += `> 🏠 \`${dotfile.homePath}\`\n`;
            markdown += `> 📦 \`${dotfile.repoPath}\`\n\n`;
            markdown += diffOutput;
          }
        }
      } catch (error) {
        markdown += `## ❌ Error comparing ${dotfile.name}\n\n`;
        markdown += `Error: ${error instanceof Error ? error.message : String(error)}\n\n`;
        markdown += "---\n\n";
      }
    }

    if (!foundAnyDifferences) {
      markdown += "## **✅ No differences found!**\n>\n";
      markdown +=
        "> All your dotfiles are perfectly in sync between your repo and home directory. 🎉\n";
    }

    setMarkdown(markdown);
    setIsLoading(false);
  };

  return <Detail markdown={markdown} isLoading={isLoading} />;
}
