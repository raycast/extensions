import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Finnish(props: LaunchProps) {
  await translate("FI", props.fallbackText);
}
