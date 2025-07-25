import { LaunchProps, List } from "@raycast/api";
import { Arguments } from "./types";
import { useCliSetup } from "./hooks/useCliSetup";
import { InstallationView } from "./views/InstallationView";
import { WordListView } from "./views/WordListView";

export default function Word4YouCommand(props: LaunchProps<{ arguments: Arguments }>) {
  const { word: argWord } = props.arguments;
  const { cliInstalled } = useCliSetup();

  if (cliInstalled === undefined) {
    return <List isLoading={true} />;
  }

  if (!cliInstalled) {
    return <InstallationView />;
  }

  return <WordListView initialWord={argWord} />;
}
