import cp from "child_process";
import os from "node:os";

const copyToClipboard = (text: string) => {
  const proc = cp.spawn("pbcopy");
  proc.stdin.write(text);
  proc.stdin.end();
};

const parseDocumentName = (name: string) => name.split(".")[0];

const isEncrypted = (name: string) => {
  const [ext] = name.split(".").slice(-1);
  return ext === "enc";
};

const getDocLocation = (name: string) => {
  return `${os.homedir()}/.raypass/${name}`;
};

export const misc = {
  copy: copyToClipboard,
  parseDocumentName,
  isEncrypted,
  getDocLocation,
};
