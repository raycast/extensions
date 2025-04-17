import { getPreferenceValues } from "@raycast/api";

/**
 * Generates a BTT URL scheme for triggering a named trigger
 * @param name The name of the trigger to run
 * @returns The URL string to trigger the named action
 */
export function getUrlForNamedTrigger(name: string): string {
  const { bttSharedSecret: secret } = getPreferenceValues();
  const params = [`trigger_name=${encodeURIComponent(name)}`];
  if (secret) {
    params.push(`shared_secret=${encodeURIComponent(secret)}`);
  }
  return `btt://trigger_named/?${params.join("&")}`;
}

/**
 * Generates an AppleScript command for triggering a named trigger in BTT
 * @param name The name of the trigger to run
 * @returns The AppleScript command string
 */
export function getAppleScriptForNamedTrigger(name: string): string {
  const { bttSharedSecret: secret } = getPreferenceValues();
  const secretParam = secret ? ` shared_secret ${JSON.stringify(secret)}` : "";

  return `tell application "BetterTouchTool"
  trigger_named_async_without_response ${JSON.stringify(name)}${secretParam}
end tell`;
}

/**
 * Generates an AppleScript command for revealing a trigger in the BTT UI
 * @param uuid The UUID of the trigger to reveal
 * @returns The AppleScript command string
 */
export function getRevealInUIAppleScript(uuid: string): string {
  const { bttSharedSecret: secret } = getPreferenceValues();
  const secretParam = secret ? ` shared_secret ${JSON.stringify(secret)}` : "";

  return `tell application "BetterTouchTool"
  reveal_element_in_ui ${JSON.stringify(uuid)}${secretParam}
end tell`;
}
