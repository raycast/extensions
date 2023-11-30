import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function PortugueseBrazil(props: LaunchProps<{ arguments?: Arguments.PortugueseBrazil }>) {
  await translate("PT-BR", props.arguments?.text ?? props.fallbackText);
}
