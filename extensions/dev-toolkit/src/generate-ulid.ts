import { ulid } from "ulid";
import { produceOutput, safeNumberArg, showError } from "./utils";
import { LaunchProps } from "@raycast/api";

export default async function Command(props?: LaunchProps<{ arguments: Arguments.GenerateUlid }>) {
  const numberArg = props?.arguments.numberOfULIDsToGenerate;
  const { error, safeNumber } = await safeNumberArg(numberArg, { min: 1, max: 1000, default: 5 });

  if (error) {
    await showError(error.message);
  } else {
    const ulids = Array.from({ length: safeNumber }, () => ulid());
    await produceOutput(ulids.join("\r\n"));
  }
}
