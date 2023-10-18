import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Italian(props: LaunchProps) {
  await translate("IT", props.fallbackText);
}
