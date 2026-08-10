import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Russian(props: LaunchProps<{ arguments?: Arguments.Russian }>) {
  await translate("RU", props.arguments?.text ?? props.fallbackText);
}
