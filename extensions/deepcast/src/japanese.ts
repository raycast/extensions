import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Japanese(props: LaunchProps<{ arguments?: Arguments.Japanese }>) {
  await translate("JA", props.arguments?.text ?? props.fallbackText);
}
