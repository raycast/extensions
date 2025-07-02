import path from "path";
import Project from "../types/project";
import { open } from "@raycast/api";

type Input = {
  /**
   * This is the project to open. Use the getAllProjects tool to get a list of projects. If no project name is provided, ask the user which project they would like to open.
   */
  project: Project;
};

export default async function openTerminal(input: Input) {
  const project = input.project;
  const projectPath = path.join(project.fullPath);
  const terminalUrl = `file://${projectPath}`;
  open(terminalUrl, "com.apple.Terminal");
}
