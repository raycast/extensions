import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function EnglishUK(props: LaunchProps<{ arguments?: Arguments.EnglishUK }>) {
  await translate("EN-GB", props.arguments?.text ?? props.fallbackText);
}
