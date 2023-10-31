import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Latvian(props: LaunchProps<{ arguments?: Arguments.Latvian }>) {
  await translate("LV", props.arguments?.text ?? props.fallbackText);
}
