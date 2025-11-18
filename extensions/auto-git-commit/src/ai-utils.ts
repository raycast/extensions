import { AI } from "@raycast/api";
import { CommitMessageData, AICommitMessage, CommitStyle } from "./types";
import { exec } from "child_process";
import { promisify } from "util";
import { promises as fs } from "fs";
import * as path from "path";

const execAsync = promisify(exec);

export class AIUtils {
  private static readonly MAX_TOKENS = 4000;
  private static readonly ESTIMATED_TOKENS_PER_CHAR = 0.25;

  static async generateCommitMessage(data: CommitMessageData): Promise<AICommitMessage> {
    try {
      const prompt = await this.buildPrompt(data);
      const result = await AI.ask(prompt);

      return {
        message: result.trim(),
        confidence: 0.8,
      };
    } catch (error) {
      console.error("Failed to generate commit message:", error);
      throw new Error("Failed to generate commit message using AI");
    }
  }

  private static async buildPrompt(data: CommitMessageData): Promise<string> {
    const { diff, style, context, customInstructions, repoName, previousMessage, regenerateInstruction, repoPath } =
      data;
    const lines: string[] = [];

    lines.push("Output only the Git commit message text, with no extra explanations, tags, or code fences.");

    const stylePrompt = await this.getStylePrompt(style, repoPath);
    lines.push(stylePrompt);

    if (repoName) {
      lines.push("Repository Name: " + repoName);
    }
    if (context) {
      lines.push("Repository Context: " + context);
    }

    if (customInstructions && customInstructions.trim()) {
      lines.push("Preference Instructions: " + customInstructions.trim());
    }
    if (previousMessage && previousMessage.trim()) {
      lines.push("Previous Generated Message: " + previousMessage.trim());
    }
    if (regenerateInstruction && regenerateInstruction.trim()) {
      lines.push("Regenerate Instruction: " + regenerateInstruction.trim());
    }

    const processedDiff = this.processDiff(diff);
    lines.push("Git Diff:\n```\n" + processedDiff + "\n```\n");
    lines.push("Generate the commit message based on the information above and return only the message.");

    return lines.join("\n");
  }

  private static async getStylePrompt(style: string, repoPath?: string): Promise<string> {
    switch (style) {
      case CommitStyle.CONVENTIONAL:
        return "Use Conventional Commits format (e.g., feat: add user auth, fix: resolve login error)";
      case CommitStyle.SIMPLE:
        return "Use a concise one-line description (under 50 characters)";
      case CommitStyle.DETAILED:
        return [
          "Write a multi-line detailed commit:",
          "- First line: a clear summary under 72 characters",
          "- Blank line",
          "- Body: bullet points explaining WHAT changed, WHY, and IMPACT",
          "- Reference key files/modules; include risks or breaking changes if any",
        ].join("\n");
      case CommitStyle.TEMPLATE: {
        const template = await this.readGitMessageTemplate(repoPath);
        if (template) {
          return [
            "Use the following commit message template as a guide:",
            "```",
            template,
            "```",
            "Follow the structure and format of the template above. Replace placeholders with actual information based on the diff.",
            "Comments (lines starting with #) are instructions and should not be included in the final message.",
          ].join("\n");
        }
        return "Use Conventional Commits format (template not found, falling back to conventional)";
      }
      default:
        return "Use Conventional Commits format";
    }
  }

  private static async readGitMessageTemplate(repoPath?: string): Promise<string | null> {
    try {
      // 1. Try to get template path from git config
      if (repoPath) {
        try {
          const { stdout } = await execAsync("git config commit.template", { cwd: repoPath });
          const templatePath = stdout.trim();
          if (templatePath) {
            const absolutePath = path.isAbsolute(templatePath) ? templatePath : path.join(repoPath, templatePath);
            const content = await fs.readFile(absolutePath, "utf-8");
            return content;
          }
        } catch {
          // Git config not set, continue to next option
        }
      }

      // 2. Try repository .gitmessage
      if (repoPath) {
        try {
          const repoTemplatePath = path.join(repoPath, ".gitmessage");
          const content = await fs.readFile(repoTemplatePath, "utf-8");
          return content;
        } catch {
          // File not found in repo, continue to next option
        }
      }

      // 3. Try home directory .gitmessage
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      if (homeDir) {
        try {
          const homeTemplatePath = path.join(homeDir, ".gitmessage");
          const content = await fs.readFile(homeTemplatePath, "utf-8");
          return content;
        } catch {
          // File not found in home directory
        }
      }

      return null;
    } catch (error) {
      console.error("Error reading git message template:", error);
      return null;
    }
  }

  private static processDiff(diff: string): string {
    const estimatedTokens = diff.length * this.ESTIMATED_TOKENS_PER_CHAR;

    if (estimatedTokens <= this.MAX_TOKENS * 0.8) {
      return diff;
    }

    const lines = diff.split("\n");
    const budget = Math.floor(this.MAX_TOKENS * 0.8 * this.ESTIMATED_TOKENS_PER_CHAR);

    const fileChanges = this.groupDiffByFile(lines);
    const sortedFiles = this.sortFilesByChangeSize(fileChanges);

    let result = "";
    let usedTokens = 0;

    for (const [filename, fileDiff] of sortedFiles) {
      const fileTokens = fileDiff.length * this.ESTIMATED_TOKENS_PER_CHAR;

      if (usedTokens + fileTokens <= budget * 0.8) {
        result += fileDiff + "\n";
        usedTokens += fileTokens;
      } else {
        const changeCount = fileDiff.split("\n").length;
        result += `# File: ${filename} (${changeCount} changes)\n`;
        result += "# [Changes summarized - file too large for full diff]\n\n";
        break;
      }
    }

    return result || diff.substring(0, Math.floor(budget / this.ESTIMATED_TOKENS_PER_CHAR));
  }

  private static groupDiffByFile(lines: string[]): Map<string, string> {
    const fileChanges = new Map<string, string>();
    let currentFile = "";
    let currentDiff = "";

    for (const line of lines) {
      if (line.startsWith("diff --git")) {
        if (currentFile && currentDiff) {
          fileChanges.set(currentFile, currentDiff);
        }
        currentFile = line.split(" ")[2] || "unknown";
        currentDiff = line + "\n";
      } else {
        currentDiff += line + "\n";
      }
    }

    if (currentFile && currentDiff) {
      fileChanges.set(currentFile, currentDiff);
    }

    return fileChanges;
  }

  private static sortFilesByChangeSize(fileChanges: Map<string, string>): [string, string][] {
    return Array.from(fileChanges.entries()).sort(([, a], [, b]) => b.length - a.length);
  }

  static async regenerateCommitMessage(data: CommitMessageData): Promise<AICommitMessage> {
    return this.generateCommitMessage({
      ...data,
      customInstructions: data.customInstructions,
      regenerateInstruction: data.regenerateInstruction,
    });
  }

  static async generateRepositoryContext(options: {
    repoName: string;
    repoPath: string;
    fileStructure?: string;
    readmeContent?: string;
    recentCommits?: string;
  }): Promise<string> {
    try {
      const { repoName, repoPath, fileStructure, readmeContent, recentCommits } = options;
      const lines: string[] = [];

      lines.push("You are analyzing a Git repository to generate a concise context description.");
      lines.push("Output ONLY the context description (1-3 sentences), with no extra explanations or formatting.");
      lines.push("");
      lines.push(`Repository Name: ${repoName}`);
      lines.push(`Repository Path: ${repoPath}`);

      if (readmeContent) {
        lines.push("");
        lines.push("README Content (first 1000 chars):");
        lines.push("```");
        lines.push(readmeContent.substring(0, 1000));
        lines.push("```");
      }

      if (fileStructure) {
        lines.push("");
        lines.push("File Structure:");
        lines.push("```");
        lines.push(fileStructure);
        lines.push("```");
      }

      if (recentCommits) {
        lines.push("");
        lines.push("Recent Commits:");
        lines.push("```");
        lines.push(recentCommits);
        lines.push("```");
      }

      lines.push("");
      lines.push(
        "Based on the information above, generate a concise context description (1-3 sentences) that describes:",
      );
      lines.push("- What this repository is (e.g., web app, library, tool, service)");
      lines.push("- Its primary purpose or functionality");
      lines.push("- Key technologies or frameworks used (if evident)");
      lines.push("");
      lines.push("Keep it concise and factual. Output only the description text.");

      const prompt = lines.join("\n");
      const result = await AI.ask(prompt);

      return result.trim();
    } catch (error) {
      console.error("Failed to generate repository context:", error);
      throw new Error("Failed to generate repository context using AI");
    }
  }
}
