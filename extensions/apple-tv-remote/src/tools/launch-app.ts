import { launchAppByName } from "../lib/apps";

type Input = {
  /** App name as the user said it, e.g. "Netflix", "Disney+", "YouTube" */
  app: string;
};

/**
 * Open an app on the Apple TV by name (e.g. Netflix, YouTube, Disney+).
 * Matches against well-known tvOS apps and the apps actually installed on the device.
 */
export default async function (input: Input): Promise<string> {
  const opened = await launchAppByName(input.app);
  return opened ? `Launched ${opened.name}` : `Could not find an app named ${input.app} on the Apple TV.`;
}
