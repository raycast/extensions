import { Action, ActionPanel, Detail, Toast, showToast } from "@raycast/api";

import { ProjectInput, StripeProject } from "../lib/types";
import { ProjectForm } from "./ProjectForm";

type OnboardingDetailProps = {
  onDidSaveProject: (
    input: ProjectInput,
  ) => Promise<StripeProject> | StripeProject;
  onUseDemo: () => Promise<unknown>;
};

const markdown = `# Check your SaaS revenue instantly.

Connect your Stripe account to:

- See MRR from your keyboard
- Catch failed payments early
- Stay in control of growth

Starter includes one live Stripe project.
Activate Pro from License & Billing when you need unlimited local workspaces.
`;

export function OnboardingDetail(props: OnboardingDetailProps) {
  async function handleUseDemo() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Loading demo metrics...",
    });

    try {
      await props.onUseDemo();
      toast.style = Toast.Style.Success;
      toast.title = "Demo metrics ready";
      toast.message = 'Type "rev" any time to come back.';
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't load demo metrics";
      toast.message =
        error instanceof Error ? error.message : "Please try again.";
    }
  }

  return (
    <Detail
      navigationTitle="Get Started"
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Connect Stripe"
              target={<ProjectForm onDidSave={props.onDidSaveProject} />}
            />
            <Action title="View Demo Metrics" onAction={handleUseDemo} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
