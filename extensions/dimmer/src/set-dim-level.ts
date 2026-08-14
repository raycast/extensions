import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { describeHUD, setDimLevel } from "./state";

type CommandProps = {
  arguments: {
    level: string;
  };
};

export default async function Command({ arguments: { level } }: CommandProps) {
  try {
    const state = await setDimLevel(Number.parseInt(level, 10));
    await showHUD(describeHUD(state));
  } catch (error) {
    await showFailureToast(error, { title: "Could not set the Dimmer level" });
  }
}
