import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchSteps } from "./api/steps";
import { Step, StepMaintainer } from "./api/types";

interface State {
  steps: Step[];
  updatedAt?: Date;
  error?: Error;
}

export default function Command() {
  const [state, setState] = useState<State>({ steps: [] });

  useEffect(() => {
    async function fetch() {
      try {
        const steps = await fetchSteps();
        setState({
          steps: steps.steps,
          updatedAt: steps.updatedAt,
        });
      } catch (error) {
        console.error(error);
        setState({
          steps: [],
          error: error instanceof Error ? error : new Error("Something went wrong"),
        });
      }
    }
    fetch();
  }, []);

  return (
    <List isLoading={state.steps.length == 0 && !state.error}>
      {state.steps.map((step) => (
        <List.Item
          key={step.id}
          title={step.title}
          icon={step.iconURL ?? Icon.Code}
          accessories={stepAccessories(step)}
          actions={
            <ActionPanel title={step.title}>
              <Action.OpenInBrowser url={`https://bitrise.io/integrations/steps/${step.id}`} />
              <Action.OpenInBrowser title="Open Source Repo in Browser" url={step.sourceURL} />
              <ActionPanel.Section>
                <Action.CopyToClipboard title="Copy Step ID" content={step.id} />
                <Action.CopyToClipboard title="Copy Step Source URL" content={step.sourceURL} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function stepAccessories(step: Step): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  if (step.maintainer == StepMaintainer.Bitrise) {
    accessories.push({
      icon: {
        source: "step-maintainer-bitrise.svg",
      },
    });
  } else if (step.maintainer == StepMaintainer.Verified) {
    accessories.push({
      icon: {
        source: "step-maintainer-verified.svg",
      },
    });
  }

  return accessories;
}
