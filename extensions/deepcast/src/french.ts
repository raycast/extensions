import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function French(props: LaunchProps) {
  await translate("FR", props.fallbackText);
}
