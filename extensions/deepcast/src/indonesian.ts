import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Indonesian(props: LaunchProps) {
  await translate("ID", props.fallbackText);
}
