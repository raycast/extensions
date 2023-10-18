import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Slovenian(props: LaunchProps) {
  await translate("SL", props.fallbackText);
}
