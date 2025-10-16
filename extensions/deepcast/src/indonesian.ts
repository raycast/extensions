import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Indonesian(props: LaunchProps<{ arguments?: Arguments.Indonesian }>) {
  await translate("ID", props.arguments?.text ?? props.fallbackText);
}
