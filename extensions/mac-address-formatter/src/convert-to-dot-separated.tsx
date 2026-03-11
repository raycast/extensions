import { LaunchProps } from "@raycast/api";
import { CommandArguments, MacAddressCommand } from "./mac-address-command";

export default function Command(
  props: LaunchProps<{ arguments: CommandArguments }>,
) {
  return (
    <MacAddressCommand
      format="dot"
      title="Convert to Dot-Separated"
      macAddress={props.arguments.macAddress}
    />
  );
}
