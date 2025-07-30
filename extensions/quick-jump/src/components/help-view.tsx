import { Action, ActionPanel, Icon, List, Detail } from "@raycast/api";
import { ValidationResult } from "../validation";
import { OpenConfigFileAction } from "./open-config-action";

interface HelpViewProps {
  validationResult: ValidationResult | null;
}

export function HelpView({ validationResult }: HelpViewProps) {
  if (!validationResult) {
    return (
      <List>
        <List.EmptyView
          title="No Validation Data"
          description="Configuration validation data is not available."
          icon={Icon.QuestionMark}
        />
      </List>
    );
  }

  const { errors, warnings } = validationResult;

  if (errors.length === 0 && warnings.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="Configuration is Valid"
          description="Your configuration file looks good! No issues found."
          icon={Icon.Checkmark}
        />
      </List>
    );
  }

  return (
    <List>
      {errors.length > 0 && (
        <List.Section title={`Errors (${errors.length})`}>
          {errors.map((error, index) => (
            <List.Item
              key={`error-${index}`}
              title={error.message}
              subtitle={error.location}
              icon={Icon.XmarkCircle}
              accessories={[{ text: "Error" }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Show Details"
                    icon={Icon.Info}
                    target={
                      <Detail
                        markdown={`# Configuration Error

## ${error.message}

**Location:** \`${error.location}\`

${error.suggestion ? `**Suggestion:** ${error.suggestion}` : ""}

### How to Fix

1. Open your configuration file
2. Navigate to the location mentioned above
3. ${error.suggestion || "Review and correct the configuration"}

### Example

\`\`\`json
{
  "${error.location.split(".").pop()}": "correct-value"
}
\`\`\`
`}
                      />
                    }
                  />
                  <ActionPanel.Section>
                    <OpenConfigFileAction />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {warnings.length > 0 && (
        <List.Section title={`Warnings (${warnings.length})`}>
          {warnings.map((warning, index) => (
            <List.Item
              key={`warning-${index}`}
              title={warning.message}
              subtitle={warning.location}
              icon={Icon.Exclamationmark2}
              accessories={[{ text: "Warning" }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Show Details"
                    icon={Icon.Info}
                    target={
                      <Detail
                        markdown={`# Configuration Warning

## ${warning.message}

**Location:** \`${warning.location}\`

${warning.suggestion ? `**Suggestion:** ${warning.suggestion}` : ""}

### About This Warning

This is a warning, not an error. Your configuration will still work, but you might want to address this for better organization.

### How to Fix

1. Open your configuration file
2. Navigate to the location mentioned above
3. ${warning.suggestion || "Review and improve the configuration"}
`}
                      />
                    }
                  />
                  <ActionPanel.Section>
                    <OpenConfigFileAction />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      <List.Section title="Quick Actions">
        <List.Item
          title="Open Configuration File"
          subtitle="Edit your JSON configuration"
          icon={Icon.Gear}
          actions={
            <ActionPanel>
              <OpenConfigFileAction />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
