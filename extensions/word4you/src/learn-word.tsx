import { LaunchProps, List } from "@raycast/api";
import { Arguments } from "./types";
import { useCliSetup } from "./hooks/useCliSetup";
import { InstallationView } from "./views/InstallationView";
import { MdDefinitionListView } from "./views/MdDefinitionListView";
import { ProviderSetupView } from "./views/ProviderSetupView";
import { isProviderConfigured } from "./config";

export default function Word4YouCommand(props: LaunchProps<{ arguments: Arguments }>) {
  const { text: argText } = props.arguments;
  const { cliInstalled } = useCliSetup();

  // Show provider setup view if user hasn't configured their AI provider and API key
  if (!isProviderConfigured()) {
    return <ProviderSetupView />;
  }

  if (cliInstalled === undefined) {
    return <List isLoading={true} />;
  }

  if (!cliInstalled) {
    return <InstallationView />;
  }

  return <MdDefinitionListView initialText={argText} />;
}
