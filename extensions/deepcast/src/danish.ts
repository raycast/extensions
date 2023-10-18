import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Danish(props: LaunchProps) {
  await translate("DA", props.fallbackText);
}
