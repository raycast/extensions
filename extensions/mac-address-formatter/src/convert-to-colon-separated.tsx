import { LaunchProps } from "@raycast/api";
import { CommandArguments, MacAddressCommand } from "./mac-address-command";

export default function Command(
  props: LaunchProps<{ arguments: CommandArguments }>,
) {
  return (
    <MacAddressCommand
      format="colon"
      title="Convert to Colon-Separated"
      macAddress={props.arguments.macAddress}
    />
  );
}
