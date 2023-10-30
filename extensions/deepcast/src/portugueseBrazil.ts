import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function PortugueseBrazil(props: LaunchProps) {
  await translate("PT-BR", props.fallbackText);
}
