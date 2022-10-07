import cp from "child_process";

import { environment } from "@raycast/api";

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
  return `${environment.supportPath}/documents/${name}`;
};

export const misc = {
  copy: copyToClipboard,
  parseDocumentName,
  isEncrypted,
  getDocLocation,
};
