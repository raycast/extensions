import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Portuguese(props: LaunchProps<{ arguments?: Arguments.Portuguese }>) {
  await translate("PT-PT", props.arguments?.text ?? props.fallbackText);
}
