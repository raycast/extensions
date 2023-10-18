import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Korean(props: LaunchProps) {
  await translate("KO", props.fallbackText);
}
