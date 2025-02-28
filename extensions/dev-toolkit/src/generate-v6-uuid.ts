import { v6 as uuidv6 } from "uuid";
import { produceOutput, safeNumberArg, showError } from "./utils";
import { LaunchProps } from "@raycast/api";

export default async function Command(props?: LaunchProps<{ arguments: Arguments.GenerateV6Uuid }>) {
  const numberArg = props?.arguments.numberOfUUIDsToGenerate;
  const { error, safeNumber } = await safeNumberArg(numberArg, { min: 1, max: 1000, default: 5 });

  if (error) {
    await showError(error.message);
  } else {
    const uuids = Array.from({ length: safeNumber }, () => uuidv6());
    await produceOutput(uuids.join("\r\n"));
  }
}
