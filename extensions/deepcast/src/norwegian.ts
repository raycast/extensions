import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Norwegian(props: LaunchProps) {
  await translate("NB", props.fallbackText);
}
