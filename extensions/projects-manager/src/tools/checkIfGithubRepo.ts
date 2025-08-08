import Project from "../types/project";
import path from "path";
import fs from "fs";

type Input = {
  /**
   * The project to check if it has a git repository
   */
  project: Project;
};

export default function checkIfGithubRepo(input: Input): boolean {
  try {
    const gitPath = path.join(input.project.fullPath, ".git");
    const hasRepo = fs.existsSync(gitPath);

    if (!hasRepo) {
      return false;
    }

    // Check for remote by reading git config
    const configPath = path.join(gitPath, "config");
    if (fs.existsSync(configPath)) {
      const config = fs.readFileSync(configPath, "utf8");
      return config.includes("[remote");
    }

    return false;
  } catch (error) {
    console.error(`Error checking git repository for ${input.project.name}:`, error);
    return false;
  }
}
