import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Swedish(props: LaunchProps) {
  await translate("SV", props.fallbackText);
}
