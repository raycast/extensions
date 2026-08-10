import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Chinese(props: LaunchProps<{ arguments?: Arguments.Chinese }>) {
  await translate("ZH", props.arguments?.text ?? props.fallbackText);
}
