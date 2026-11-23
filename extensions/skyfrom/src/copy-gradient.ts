import { LaunchProps } from "@raycast/api";
import { copyGradient, notifyFailure } from "./lib/command-ui";
import { requireSelection } from "./lib/locations";

export default async function CopySkyGradient({
  arguments: { city },
}: LaunchProps<{ arguments: Arguments.CopyGradient }>) {
  try {
    const sky = await requireSelection(city);
    await copyGradient(sky);
  } catch (error) {
    await notifyFailure("Couldn’t copy gradient", error);
  }
}
