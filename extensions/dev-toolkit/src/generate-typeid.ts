import { typeid } from "typeid-js";
import { produceOutput, safeNumberArg, showError } from "./utils";
import { LaunchProps } from "@raycast/api";

export default async function Command(props?: LaunchProps<{ arguments: Arguments.GenerateTypeid }>) {
  const typePrefix = props?.arguments.typePrefix;
  const numberArg = props?.arguments.numberOfTypeIDsToGenerate;
  const { error, safeNumber } = await safeNumberArg(numberArg, { min: 1, max: 1000, default: 5 });

  if (error) {
    await showError(error.message);
  } else {
    const typeids = Array.from({ length: safeNumber }, () => typeid(typePrefix || ""));
    await produceOutput(typeids.join("\r\n"));
  }
}
