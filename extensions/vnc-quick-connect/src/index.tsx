import { getPreferenceValues, showHUD } from "@raycast/api";
import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";

type Arguments = {
  address: string;
};

type Preferences = {
  viewerPath: string;
  preferUnencrypted: boolean;
  suppressUnencryptedWarning: boolean;
};

function normalizeAddress(input: string): string {
  const trimmed = input.trim();
  const hostAndPort = trimmed.match(/^(.+?)\s+([0-9]+)$/);
  const bracketedHostAndPort = trimmed.match(/^(\[[^\]]+\]):([0-9]+)$/);
  const hostColonPort = trimmed.match(/^([^:\s]+):([0-9]+)$/);

  if (hostAndPort) {
    return `${hostAndPort[1]}::${hostAndPort[2]}`;
  }

  if (bracketedHostAndPort) {
    return `${bracketedHostAndPort[1]}::${bracketedHostAndPort[2]}`;
  }

  if (hostColonPort) {
    return `${hostColonPort[1]}::${hostColonPort[2]}`;
  }

  return trimmed;
}

export default async function Command(props: { arguments: Arguments }) {
  const preferences = getPreferenceValues<Preferences>();
  const address = normalizeAddress(props.arguments.address);

  if (!address) {
    await showHUD("Enter a VNC address, for example 192.168.1.10 5900");
    return;
  }

  await access(preferences.viewerPath, constants.X_OK);

  const viewerArgs = ["-UriSuppressConnectionPrompt=1"];

  if (preferences.preferUnencrypted) {
    viewerArgs.push("-Encryption=PreferOff");
  }

  if (preferences.suppressUnencryptedWarning) {
    viewerArgs.push("-WarnUnencrypted=0", "-SecurityNotificationTimeout=0");
  }

  viewerArgs.push(address);

  const viewer = spawn(preferences.viewerPath, viewerArgs, {
    detached: true,
    stdio: "ignore",
  });

  viewer.unref();

  await showHUD(`Opening VNC: ${address}`);
}
