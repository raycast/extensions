import { getProject } from "../clockodo";

type Input = {
  /**
   * The id of the project
   */
  projectId: number;
};

/** Loads a Clockodo project by id (includes its name). */
export default async function (input: Input) {
  return getProject(input.projectId);
}
