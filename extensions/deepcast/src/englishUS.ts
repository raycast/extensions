import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function EnglishUS(props: LaunchProps) {
  await translate("EN-US", props.fallbackText);
}
