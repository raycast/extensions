import { VM } from "./types";

function parseVMObject(str: string): VM {
  const data = str.split(" ");

  return {
    name: data[0].replaceAll('"', ""),
    uuid: data[1].replaceAll(/[{}]/g, ""),
  };
}

export function parseFromStdout({ stdout }: { stdout: string }): VM[] {
  return stdout
    .split("\n")
    .filter((line) => line.length > 0)
    .map(parseVMObject);
}
