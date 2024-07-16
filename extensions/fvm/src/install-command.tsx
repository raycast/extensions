import { LaunchProps } from "@raycast/api";
import ConsoleView, { CommandType } from "./components/ConsoleView";

export default function InstallCommand(props: LaunchProps<{ arguments: Arguments.InstallCommand }>) {
  const { version } = props.arguments;

  return <ConsoleView command={CommandType.Install} version={version} />;
}
