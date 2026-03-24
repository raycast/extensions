import { ActionPanel, Action, Icon, environment, Detail } from "@raycast/api";

/**
 * Step 1: Welcome Screen
 */
export function WelcomeStep({ onNext }: { onNext: () => void }) {
  const banner =
    environment.appearance === "dark" ? "step1@dark.png" : "step1.png";
  const welcomeMarkdown = `![InFlow](${banner})`;

  return (
    <Detail
      markdown={welcomeMarkdown}
      navigationTitle="Initialize InFlow (1/4)"
      actions={
        <ActionPanel>
          <Action title="Continue" onAction={onNext} icon={Icon.ArrowRight} />
        </ActionPanel>
      }
    />
  );
}

/**
 * Step 2: Usage Introduction
 */
export function UsageStep({ onNext }: { onNext: () => void }) {
  const banner =
    environment.appearance === "dark" ? "step2@dark.png" : "step2.png";
  const usageMarkdown = `![InFlow](${banner})`;

  return (
    <Detail
      markdown={usageMarkdown}
      navigationTitle="How to use (2/4)"
      actions={
        <ActionPanel>
          <Action title="Continue" onAction={onNext} icon={Icon.ArrowRight} />
        </ActionPanel>
      }
    />
  );
}

/**
 * Step 4: Completion Screen
 */
export function FinishStep({ onFinish }: { onFinish: () => void }) {
  const banner =
    environment.appearance === "dark" ? "step4@dark.png" : "step4.png";
  const finishMarkdown = `![InFlow](${banner})`;

  return (
    <Detail
      markdown={finishMarkdown}
      navigationTitle="All set (4/4)"
      actions={
        <ActionPanel>
          <Action
            title="Get Started"
            onAction={onFinish}
            icon={Icon.Checkmark}
          />
        </ActionPanel>
      }
    />
  );
}
