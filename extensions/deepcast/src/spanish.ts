import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Spanish(props: LaunchProps<{ arguments?: Arguments.Spanish }>) {
  await translate("ES", props.arguments?.text ?? props.fallbackText);
}
