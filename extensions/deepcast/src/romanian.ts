import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Romanian(props: LaunchProps) {
  await translate("RO", props.fallbackText);
}
