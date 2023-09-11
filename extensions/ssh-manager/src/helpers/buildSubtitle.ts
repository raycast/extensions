import { ISSHConnection } from "../types";

export default function buildSubtitle(item: ISSHConnection) {
  if (item.subtitle) {
    return item.subtitle;
  }

  return `${item.user ? item.user + "@" : ""}${item.address}${item.port ? " Port: " + item.port : ""}${
    item.sshKey ? " SSH Key: " + item.sshKey : ""
  } ${item.command ? ' Command: "' + item.command + '"' : ""}`;
}
