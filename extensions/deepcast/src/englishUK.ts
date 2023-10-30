import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function EnglishUK(props: LaunchProps) {
  await translate("EN-GB", props.fallbackText);
}
