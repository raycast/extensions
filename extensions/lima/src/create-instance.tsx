import { LaunchProps } from "@raycast/api";
import { CreateInstanceForm } from "./components/create-instance-form";

export default function Command({ arguments: args }: LaunchProps<{ arguments: Arguments.CreateInstance }>) {
  return <CreateInstanceForm name={args.name} />;
}
