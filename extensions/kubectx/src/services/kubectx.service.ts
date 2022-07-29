import { execFile } from "child_process";
import util from "util";

import { commandOutputToArray } from "../lib/cli.parser";
import { getBrewExecutablePath } from "../lib/cli";

const execFilePromise = util.promisify(execFile);

const path = getBrewExecutablePath("kubectx");

export const getCurrentContext = async () => {
  const { stdout } = await execFilePromise(`${path}`, ["-c"]);

  const currentContext = commandOutputToArray(stdout)[0];

  return currentContext;
};

export const getAllContextes = async () => {
  const { stdout } = await execFilePromise(`${path}`);

  const contextes = commandOutputToArray(stdout);

  return contextes;
};

export const switchContext = async (newContextName: string) => {
  await execFilePromise(`${path}`, [newContextName]);
};

export default {
  getAllContextes,
  getCurrentContext,
  switchContext,
};
