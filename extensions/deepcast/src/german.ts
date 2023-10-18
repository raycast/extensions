import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function German(props: LaunchProps) {
  await translate("DE", props.fallbackText);
}
