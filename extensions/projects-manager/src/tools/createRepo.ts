import Project from "../types/project";
import { createGitRepo } from "../utils/functions";

type Input = {
  project: Project;
};

export default function createRepo(input: Input) {
  const project = input.project;
  createGitRepo(project);
}
