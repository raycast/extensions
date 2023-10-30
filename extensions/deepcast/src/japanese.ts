import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Japanese(props: LaunchProps) {
  await translate("JA", props.fallbackText);
}
