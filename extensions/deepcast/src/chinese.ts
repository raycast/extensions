import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Chinese(props: LaunchProps) {
  await translate("ZH", props.fallbackText);
}
