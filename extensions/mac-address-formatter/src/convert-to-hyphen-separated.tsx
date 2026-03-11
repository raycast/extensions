import { LaunchProps } from "@raycast/api";
import { CommandArguments, MacAddressCommand } from "./mac-address-command";

export default function Command(
  props: LaunchProps<{ arguments: CommandArguments }>,
) {
  return (
    <MacAddressCommand
      format="hyphen"
      title="Convert to Hyphen-Separated"
      macAddress={props.arguments.macAddress}
    />
  );
}
