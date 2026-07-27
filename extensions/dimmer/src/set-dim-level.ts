import { showHUD } from "@raycast/api";
import { describeHUD, setDimLevel } from "./state";

type CommandProps = {
  arguments: {
    level: string;
  };
};

export default async function Command({ arguments: { level } }: CommandProps) {
  const state = await setDimLevel(Number.parseInt(level, 10));
  await showHUD(describeHUD(state));
}
