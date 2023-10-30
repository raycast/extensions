import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Bulgarian(props: LaunchProps) {
  await translate("BG", props.fallbackText);
}
