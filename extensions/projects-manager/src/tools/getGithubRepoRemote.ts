import Project from "../types/project";
import path from "path";
import fs from "fs";

type Input = {
  /**
   * The project to get the github repo remote for
   */
  project: Project;
};

export default function getGithubRepoRemote(input: Input): string {
  try {
    const gitPath = path.join(input.project.fullPath, ".git");
    const hasRepo = fs.existsSync(gitPath);

    if (!hasRepo) {
      return "";
    }

    // Check for remote by reading git config
    const configPath = path.join(gitPath, "config");
    if (fs.existsSync(configPath)) {
      const config = fs.readFileSync(configPath, "utf8");
      const remoteUrlMatch = config.match(/\burl\s*=\s*(https:\/\/github\.com\/[^\s]+\.git)\b/);
      if (remoteUrlMatch) {
        return remoteUrlMatch[1].replace(".git", "").replace("https://github.com/", "");
      }
    }

    return "";
  } catch (error) {
    console.error(`Error checking git repository for ${input.project.name}:`, error);
    return "";
  }
}
