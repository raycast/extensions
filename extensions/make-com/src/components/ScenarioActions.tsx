import {
  Action,
  ActionPanel,
  Icon,
  PopToRootType,
  Toast,
  closeMainWindow,
  showHUD,
  showToast,
} from "@raycast/api";
import useMake from "../hooks/useMake";

interface Props {
  scenarioId: number;
  teamId: number;
}

export default function ScenarioActions({ scenarioId, teamId }: Props) {
  const { runScenario, environmentUrl } = useMake();

  const handleRunScenario = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Running Scenario...",
      message: "This may take a few seconds.",
    });

    try {
      const { executionId } = await runScenario(scenarioId);

      if (executionId) {
        toast.style = Toast.Style.Success;
        toast.title = "Scenario ran successfully";
        toast.message = `Execution ID: ${executionId}`;
      }

      showHUD("Scenario triggered! 💪", {
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
      });

      closeMainWindow();
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.style = Toast.Style.Failure;
        toast.title = err.message;
        toast.message = "";
      }
    }
  };

  return (
    <ActionPanel>
      <Action title="Run" onAction={handleRunScenario} icon={Icon.Wand} />
      <Action.OpenInBrowser
        title="Show Logs"
        icon={Icon.Receipt}
        url={`${environmentUrl}/${teamId}/scenarios/${scenarioId}/logs`}
      />
      <Action.OpenInBrowser
        title="Edit Scenario"
        icon={Icon.Terminal}
        shortcut={{
          modifiers: ["cmd"],
          key: "e",
        }}
        url={`${environmentUrl}/${teamId}/scenarios/${scenarioId}/edit`}
      />
    </ActionPanel>
  );
}
