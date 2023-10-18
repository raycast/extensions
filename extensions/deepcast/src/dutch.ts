import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Dutch(props: LaunchProps) {
  await translate("NL", props.fallbackText);
}
