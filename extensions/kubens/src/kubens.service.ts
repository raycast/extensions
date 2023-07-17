import { execFile } from "child_process";
import util from "util";

import { commandOutputToArray } from "./cli.parser";
import { getBrewExecutablePath } from "./cli";

const execFilePromise = util.promisify(execFile);

const path = getBrewExecutablePath("kubens");

export const getCurrentNamespace = async () => {
  const { stdout } = await execFilePromise(`${path}`, ["-c"]);

  const currentNamespace = commandOutputToArray(stdout)[0];

  return currentNamespace;
};

export const getAllNamespaces = async () => {
  const { stdout } = await execFilePromise(`${path}`);

  const namespaces = commandOutputToArray(stdout);

  return namespaces;
};

export const switchNamespace = async (newNamespaceName: string) => {
  await execFilePromise(`${path}`, [newNamespaceName]);
};

export default {
  getAllNamespaces,
  getCurrentNamespace,
  switchNamespace,
};
