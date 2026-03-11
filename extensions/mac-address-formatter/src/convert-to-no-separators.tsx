import { LaunchProps } from "@raycast/api";
import { CommandArguments, MacAddressCommand } from "./mac-address-command";

export default function Command(
  props: LaunchProps<{ arguments: CommandArguments }>,
) {
  return (
    <MacAddressCommand
      format="plain"
      title="Convert to No Separators"
      macAddress={props.arguments.macAddress}
    />
  );
}
