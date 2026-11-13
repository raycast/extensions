import { getPreferenceValues } from "@raycast/api";
import { SSHToken } from "../types";
import { machinePath, request } from "./instabox";

/** Issues a short-lived SSH token: a plain `ssh` command that logs in without a key or the InstaBox CLI. */
export function createSshToken(machineId: string) {
  const { sshTokenTtl } = getPreferenceValues<Preferences>();
  const ttlSeconds = Number(sshTokenTtl) || 28800;
  return request<SSHToken>("POST", machinePath(machineId, "/ssh-tokens"), {
    body: { name: "Raycast", ttlSeconds },
  });
}

/** Revokes every SSH token of the machine and closes the connections that use them. */
export function revokeSshTokens(machineId: string) {
  return request<{ revoked: number }>("DELETE", machinePath(machineId, "/ssh-tokens"));
}
