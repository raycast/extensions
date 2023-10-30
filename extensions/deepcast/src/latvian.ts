import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Latvian(props: LaunchProps) {
  await translate("LV", props.fallbackText);
}
