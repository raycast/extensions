import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Greek(props: LaunchProps<{ arguments?: Arguments.Greek }>) {
  await translate("EL", props.arguments?.text ?? props.fallbackText);
}
