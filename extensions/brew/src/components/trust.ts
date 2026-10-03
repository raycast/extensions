/**
 * The trust step in front of anything that makes Homebrew load a package from a
 * third-party tap: install, upgrade, both previews, and their Terminal forms.
 *
 * It has to come BEFORE a preview, not after: a fully-qualified
 * `brew install --dry-run` or `brew upgrade --dry-run` trusts that package
 * itself and writes it to trust.json (verified on 7.0.6). Opening a preview
 * would otherwise grant trust silently, and a declined install would leave it
 * granted. `brew upgrade` with no names is safe without it: brew skips
 * untrusted taps' packages there and warns rather than trusting them.
 */

import { Alert, confirmAlert } from "@raycast/api";
import {
  actionsLogger,
  brewIdentifier,
  brewName,
  brewPackageTrust,
  brewTapCommand,
  ensureError,
  execBrew,
  isCask,
  showBrewFailureToast,
  thirdPartyTapOf,
} from "../utils";
import type { Cask, Nameable } from "../utils";

/**
 * Resolve true when Homebrew may load this package: it is core or cask, brew
 * predates trust, it is already trusted, or the user just trusted it. Trust is
 * granted to the one package, never the whole tap — Manage Taps is where a
 * whole tap is trusted.
 */
export async function ensureTrusted(item: Cask | Nameable): Promise<boolean> {
  const tap = thirdPartyTapOf(item);
  if (!tap) return true;
  const name = brewName(item);
  const fullName = brewIdentifier(item);
  const cask = isCask(item);

  try {
    if ((await brewPackageTrust(tap, fullName, cask)) !== "untrusted") return true;
  } catch (err) {
    // Fail closed: an unanswered trust question is not a yes.
    await showBrewFailureToast(`Could not check whether ${name} is trusted`, ensureError(err));
    return false;
  }

  const command = brewTapCommand("trust", cask ? "--cask" : "--formula", fullName);
  const confirmed = await confirmAlert({
    title: `Trust ${name}?`,
    message: [
      `${name} comes from ${tap}, maintained by ${tap.split("/")[0]}, not Homebrew.`,
      "Homebrew will not install or upgrade it, or preview either, until you trust it. Nothing else from the tap is trusted.",
    ].join("\n\n"),
    primaryAction: { title: "Trust", style: Alert.ActionStyle.Default },
    dismissAction: { title: "Cancel" },
  });
  if (!confirmed) {
    actionsLogger.log("Trust declined", { fullName });
    return false;
  }

  try {
    await execBrew(command, { raw: true });
    actionsLogger.log("Trusted package", { fullName });
    return true;
  } catch (err) {
    await showBrewFailureToast(`Failed to trust ${name}`, ensureError(err));
    return false;
  }
}
