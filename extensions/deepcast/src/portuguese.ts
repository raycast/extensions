import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Portuguese(props: LaunchProps) {
  await translate("PT-PT", props.fallbackText);
}
