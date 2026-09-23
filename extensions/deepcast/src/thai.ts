import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Thai(props: LaunchProps<{ arguments?: Arguments.Thai }>) {
  await translate("TH", props.arguments?.text ?? props.fallbackText);
}
