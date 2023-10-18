import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Russian(props: LaunchProps) {
  await translate("RU", props.fallbackText);
}
