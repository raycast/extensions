import { LaunchType, launchCommand } from "@raycast/api";
import { removeTheThing } from "../utils";

export default async function Command() {
  try {
    await launchCommand({ name: "show-one-thing", type: LaunchType.Background });
  } catch (error) {
    throw new Error("Menu bar is not activated, please run the 'Show One Thing' command first.");
  }

  return removeTheThing();
}
