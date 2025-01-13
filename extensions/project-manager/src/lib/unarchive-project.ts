import * as child_process from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const exec = promisify(child_process.exec);

export async function unarchiveProject(archive: string) {
  const basename = path.basename(archive);
  const projectsDir = path.dirname(archive);

  await exec(`tar -xjf ${basename}`, {
    cwd: projectsDir,
  });

  await exec(`rm -rf ${basename}`, {
    cwd: projectsDir,
  });
}
