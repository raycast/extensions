import { EXTENSION_ID } from "../chromium/preferences";
import { browserById, browserName } from "../browsers/registry";
import { Extension } from "../model";

export function settingsTarget(extension: Pick<Extension, "id" | "browser" | "profile" | "profileName">) {
  const browser = browserById(extension.browser);
  if (!browser) throw new Error(`Settings navigation is unavailable for ${browserName(extension.browser)}.`);
  if (
    !EXTENSION_ID.test(extension.id) ||
    !extension.profile ||
    /[/\\\0]/.test(extension.profile) ||
    extension.profile === "." ||
    extension.profile === ".."
  )
    throw new Error("Invalid extension or profile identity");
  const detailUrl = `${browser.extensionsUrl}?id=${extension.id}`;
  return {
    browser,
    detailUrl,
    args: ["-b", browser.bundleId, "--args", `--profile-directory=${extension.profile}`, detailUrl],
    message: `Select “${extension.profileName}” in ${browser.name} and verify the profile. The extension ID is copied; profile selection is not guaranteed.`,
  };
}
