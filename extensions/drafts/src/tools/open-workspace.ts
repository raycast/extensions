import { CallbackUrl } from "../utils/CallbackUrlUtils";
import { CallbackBaseUrls } from "../utils/Defines";
import { getWorkspaces } from "../utils/get-workspaces";

type Input = {
  /**
   * The name of the workspace to open.
   */
  name: string;
};

export default async function (input: Input) {
  const workspaces = await getWorkspaces();

  const foundWorkspace = workspaces.filter((workspace) => {
    return workspace.name.toLowerCase().includes(input.name.toLowerCase());
  });

  if (foundWorkspace.length != 1) {
    return false;
  }

  const callbackUrl = new CallbackUrl(CallbackBaseUrls.OPEN_WORKSPACE);
  callbackUrl.addParam({ name: "name", value: input.name });
  await callbackUrl.openCallbackUrl();
  return true;
}
