import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Spanish(props: LaunchProps) {
  await translate("ES", props.fallbackText);
}
