import { getProject } from "../clockodo";

type Input = {
  /**
   * The id of the project
   */
  projectId: number;
};

export default async function (input: Input) {
  return getProject(input.projectId);
}
