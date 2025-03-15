import { LaunchProps } from "@raycast/api";
import { nanoid } from "nanoid";
import { produceOutput, safeNumberArg, showError } from "./utils";

export default async function Command(props?: LaunchProps<{ arguments: Arguments.GenerateNanoid }>) {
  try {
    const lengthArg = props?.arguments.length;
    const { error, safeNumber: length } = await safeNumberArg(lengthArg, { min: 1, max: 100, default: 25 });

    if (error) {
      await showError(error.message);
      return;
    }

    // Generate nanoid with specified length
    const id = nanoid(length);
    await produceOutput(id);
  } catch (error) {
    await showError("Failed to generate nanoid: " + String(error));
  }
}
