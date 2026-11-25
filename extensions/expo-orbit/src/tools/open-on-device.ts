import { Tool } from "@raycast/api";
import { getAudioPreference } from "../lib/feedback";
import { findDevice } from "../lib/find-device";
import { describeSource, launchOnDevice, parseLaunchSource } from "../lib/launch";

type Input = {
  /**
   * What to open: an EAS Build install URL (https://expo.dev/artifacts/…), an EAS Update URL (exp://u.expo.dev/… or
   * https://u.expo.dev/…), a Snack URL (exp://…), an expo-orbit:// link, or the absolute path of an .apk, .app,
   * .ipa or .tar.gz file.
   */
  url: string;
  /** The `id` of the device from get-devices. */
  device: string;
};

async function resolve(input: Input) {
  // The device must be named exactly, so the one the user approves is the one the build opens on.
  return { source: parseLaunchSource(input.url), device: await findDevice(input.device) };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const { source, device } = await resolve(input);
  return {
    message: `Open this ${source.kind === "file" ? "app file" : source.kind === "build" ? "build" : source.kind === "update" ? "EAS Update" : "Snack"} on ${device.name}?`,
    info: [
      { name: "Source", value: input.url },
      { name: "Device", value: device.name },
      { name: "Device ID", value: device.id },
    ],
  };
};

/** Installs and launches a build or app file, opens an EAS Update, or opens a Snack in Expo Go on a device. */
export default async function tool(input: Input) {
  const { source, device } = await resolve(input);
  await launchOnDevice(source, device, { audio: getAudioPreference() });
  return { device: device.name, opened: describeSource(source) };
}
