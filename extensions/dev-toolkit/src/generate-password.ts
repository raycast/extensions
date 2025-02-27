import { LaunchProps } from "@raycast/api";
import { produceOutput, safeNumberArg, showError } from "./utils";
import { generate } from "generate-password";

export default async function Command(props?: LaunchProps<{ arguments: Arguments.GeneratePassword }>) {
  const characterArg = props?.arguments.numberOfCharacters;
  const { error, safeNumber } = await safeNumberArg(characterArg, { min: 1, max: 1000, default: 8 });

  if (error) {
    await showError(error.message);
  } else {
    const password = generate({
      length: safeNumber,
      numbers: true,
      symbols: true,
      uppercase: true,
      excludeSimilarCharacters: true,
    });
    await produceOutput(password);
  }
}
