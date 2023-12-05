import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Slovenian(props: LaunchProps<{ arguments?: Arguments.Slovenian }>) {
  await translate("SL", props.arguments?.text ?? props.fallbackText);
}
