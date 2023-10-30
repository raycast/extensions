import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Polish(props: LaunchProps) {
  await translate("PL", props.fallbackText);
}
