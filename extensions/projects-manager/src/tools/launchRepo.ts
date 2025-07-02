import path from "path";
import Project from "../types/project";
import fs from "fs";
import { open } from "@raycast/api";

type Input = {
  /**
   * The project to launch the repository for
   */
  project: Project;
};

export default function launchRepo(input: Input) {
  try {
    const gitPath = path.join(input.project.fullPath, ".git");
    const configPath = path.join(gitPath, "config");

    if (!fs.existsSync(configPath)) {
      throw new Error("No git repository found for project");
    }

    const config = fs.readFileSync(configPath, "utf8");
    const urlMatch = config.match(/url = (.+)/);

    if (urlMatch && urlMatch[1]) {
      // Clean up the URL - remove .git suffix and any trailing whitespace
      const repoUrl = urlMatch[1].trim().replace(/\.git$/, "");
      open(repoUrl);
    }
  } catch (error) {
    console.error(`Error getting git repo URL for ${input.project.name}:`, error);
  }
}
