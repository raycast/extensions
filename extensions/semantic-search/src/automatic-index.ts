import {
  environment,
  getPreferenceValues,
  LaunchType,
  showHUD,
  updateCommandMetadata,
} from "@raycast/api";
import {
  automaticEnabled,
  automaticSummary,
  AutomaticStatus,
} from "./automatic-client";
import { getLauncherOwner } from "./launcher";
import { connectService, sharedStorage } from "./service";
import { BackgroundNotReady } from "./runtime";

export default async function Command() {
  const background = environment.launchType === LaunchType.Background;
  const custom = Boolean(getPreferenceValues<Preferences>().serviceURL?.trim());
  if (!custom && !(await automaticEnabled(sharedStorage))) {
    await updateCommandMetadata({
      subtitle: "Automatic updates are off or paused",
    });
    if (!background)
      await showHUD("Enable automatic updates in Manage Library");
    return;
  }
  let base: string;
  try {
    base = await connectService(() => {}, true);
  } catch (error) {
    if (!(error instanceof BackgroundNotReady)) throw error;
    await updateCommandMetadata({ subtitle: error.message });
    if (!background) await showHUD(error.message);
    return;
  }
  if (custom) {
    const response = await fetch(`${base}/v1/automatic`, {
      signal: AbortSignal.timeout(5000),
    });
    const status = (await response.json()) as AutomaticStatus & {
      detail?: string;
    };
    if (!response.ok)
      throw new Error(
        status.detail || "Could not read automatic update settings",
      );
    if (!status.enabled || status.paused) {
      const subtitle = automaticSummary(status);
      await updateCommandMetadata({ subtitle });
      if (!background) await showHUD(subtitle);
      return;
    }
  }
  const launcher = await getLauncherOwner(true);
  const response = await fetch(`${base}/v1/automatic/tick`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ launcher }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await response.json()) as AutomaticStatus & { detail?: string };
  if (!response.ok)
    throw new Error(data.detail || "Automatic index check failed");
  const subtitle = automaticSummary(data);
  await updateCommandMetadata({ subtitle });
  if (!background) await showHUD(subtitle);
}
