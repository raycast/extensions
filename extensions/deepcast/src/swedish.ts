import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Swedish(props: LaunchProps<{ arguments?: Arguments.Swedish }>) {
  await translate("SV", props.arguments?.text ?? props.fallbackText);
}
