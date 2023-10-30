import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Czech(props: LaunchProps) {
  await translate("CS", props.fallbackText);
}
