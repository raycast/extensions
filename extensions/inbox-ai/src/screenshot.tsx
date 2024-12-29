import { LaunchProps } from "@raycast/api";
import ActionList from "./components/ActionList";

interface CommandContext {
  actionId?: string;
}

export default function Command(props: LaunchProps<{ launchContext: CommandContext }>) {
  return (
    <ActionList
      commandName="screenshot"
      supportedTypes={["askAI"]}
      urlScheme="screenshot"
      launchContext={props.launchContext}
    />
  );
}

// Add this at the top level of the file to help with debugging
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});
