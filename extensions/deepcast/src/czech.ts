import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Czech(props: LaunchProps<{ arguments?: Arguments.Czech }>) {
  await translate("CS", props.arguments?.text ?? props.fallbackText);
}
