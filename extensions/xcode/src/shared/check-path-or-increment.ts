import { joinPathComponents } from "../shared/join-path-components";
import * as os from "os";
import { existsAsync } from "../shared/fs-async";

/**
 * return a valid file path
 * @param location: location in which we want to save the playground file.
 * @param filename: filename of the created or opened playground file.
 * @param forceCreate: define if we want to force create or not.
 */
export async function getValidPath(location: string, filename: string, forceCreate: boolean): Promise<string> {
  let path = "";
  let iteration = null;
  const targetLocation = location.replace(/^~/, os.homedir());
  do {
    const dateString = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const name =
      iteration == null ? `${filename}-${dateString}.playground` : `${filename}-${dateString}-${iteration}.playground`;
    path = joinPathComponents(targetLocation, name);
    iteration = iteration == null ? 1 : iteration + 1;
  } while ((await existsAsync(path)) == true && forceCreate == true);
  return path;
}
