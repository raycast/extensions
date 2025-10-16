import { spawnSync } from "node:child_process";

const shellCommandShortcuts = "shortcuts";

export const checkShortcut = async (name: string) => {
  const ret = spawnSync(shellCommandShortcuts, ["list"], {
    shell: true,
  });
  if (ret.error) {
    console.error(ret.error);
    return false;
  } else {
    const list = ret.stdout.toString().split("\n");
    return list.includes(name);
  }
};

export const runShortcut = async (name: string, input: string) => {
  const command = `echo "${input}" | shortcuts run "${name}"`;

  return spawnSync(command, {
    shell: true,
  });
};
