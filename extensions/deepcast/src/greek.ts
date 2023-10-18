import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Greek(props: LaunchProps) {
  await translate("EL", props.fallbackText);
}
