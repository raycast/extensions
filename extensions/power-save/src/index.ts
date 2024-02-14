import { showHUD } from "@raycast/api";
import { SpawnSyncReturns, execSync } from "child_process";

const isSpawnReturn = (e: unknown): e is SpawnSyncReturns<Buffer> => {
  return typeof e === "object" && e !== null && "status" in e && "stdout" in e && "stderr" in e;
};

class UserCancelledError extends Error {
  constructor(msg: string) {
    super(msg);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, UserCancelledError.prototype);
  }
}

const runCommand = async (command: string) => {
  const osaCommand = `osascript -e 'do shell script "${command}" with administrator privileges'`;
  await showHUD("Administrator Privileges Required");
  try {
    const res = execSync(osaCommand, { shell: "/bin/bash" });
    return await res.toString().replace(/\n$/, "");
  } catch (e) {
    if (isSpawnReturn(e)) {
      console.error(`Command exited with status ${e.status}`);
      console.error(`stdout: ${e.stdout.toString()}`);
      console.error(`stderr: ${e.stderr.toString()}`);
      if (e.stderr.includes("User canceled")) {
        throw new UserCancelledError("User canceled the operation.");
      }
    } else {
      console.error(e);
    }
    throw new Error(`Command ${command} failed to run.`);
  }
};

export default async function main() {
  const command =
    'powerSaveStatus=$(pmset -g | grep lowpowermode) && if [[ $powerSaveStatus == *\\"1\\"* ]]; then sudo pmset -a lowpowermode 0 && echo \\"Power Save Mode Disabled 🪫\\"; else sudo pmset -a lowpowermode 1 && echo \\"Power Save Mode Enabled 🔋\\"; fi';
  try {
    const res = await runCommand(command);
    await showHUD(res);
  } catch (e) {
    if (e instanceof UserCancelledError) {
      await showHUD("Authorization was cancelled. Please try again.🔃");
      return;
    } else {
      await showHUD("Failed to toggle Power Save Mode. Please try again.🔃");
    }
  }
}
