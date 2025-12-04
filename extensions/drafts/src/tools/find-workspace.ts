import { getWorkspaces } from "../utils/get-workspaces";

type Input = {
  /**
   * The search term to search for in the workspaces.
   */
  searchTerm: string;
};

export default async function (input: Input) {
  const workspaces = await getWorkspaces();

  const foundWorkspace = workspaces.filter((workspace) => {
    return workspace.name.toLowerCase().includes(input.searchTerm.toLowerCase());
  });

  if (foundWorkspace.length != 1) {
    return false;
  } else {
    return foundWorkspace[0];
  }
}
