import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function EnglishUS(props: LaunchProps<{ arguments?: Arguments.EnglishUS }>) {
  await translate("EN-US", props.arguments?.text ?? props.fallbackText);
}
