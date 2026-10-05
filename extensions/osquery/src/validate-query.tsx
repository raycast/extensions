import {
  Action,
  ActionPanel,
  Form,
  List,
  getPreferenceValues,
  Icon,
  Color,
  useNavigation,
  Clipboard,
} from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import {
  validateQuery,
  ValidationResult,
  ValidationIssue,
  IssueSeverity,
} from "./schema/validator";

const SEVERITY_CONFIG: Record<
  IssueSeverity,
  { icon: Icon; color: Color; label: string }
> = {
  error: { icon: Icon.XMarkCircle, color: Color.Red, label: "Error" },
  warning: {
    icon: Icon.ExclamationMark,
    color: Color.Orange,
    label: "Warning",
  },
  info: { icon: Icon.Info, color: Color.Blue, label: "Info" },
};

function IssueDetail({ issue }: { issue: ValidationIssue }) {
  const config = SEVERITY_CONFIG[issue.severity];
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title={config.label}>
            <List.Item.Detail.Metadata.TagList.Item
              text={issue.message}
              color={config.color}
            />
          </List.Item.Detail.Metadata.TagList>
          {issue.suggestion && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Suggestion"
                text={issue.suggestion}
              />
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function ValidationResults({
  query,
  result,
  onBack,
}: {
  query: string;
  result: ValidationResult;
  onBack: () => void;
}) {
  const sortedIssues = useMemo(() => {
    const order: Record<IssueSeverity, number> = {
      error: 0,
      warning: 1,
      info: 2,
    };
    return [...result.issues].sort(
      (a, b) => order[a.severity] - order[b.severity],
    );
  }, [result.issues]);

  const errorCount = result.issues.filter((i) => i.severity === "error").length;
  const warningCount = result.issues.filter(
    (i) => i.severity === "warning",
  ).length;
  const infoCount = result.issues.filter((i) => i.severity === "info").length;

  return (
    <List
      isShowingDetail
      navigationTitle="Validation Results"
      searchBarPlaceholder="Filter issues..."
    >
      <List.Section
        title={`${result.valid ? "✅ Query Valid" : "❌ Query Invalid"} • ${errorCount} errors, ${warningCount} warnings, ${infoCount} info`}
      >
        {sortedIssues.length === 0 ? (
          <List.Item
            title="No issues found"
            subtitle="Query looks good!"
            icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
            detail={
              <List.Item.Detail
                markdown={`\`\`\`sql\n${query}\n\`\`\``}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.TagList title="Status">
                      <List.Item.Detail.Metadata.TagList.Item
                        text="Valid"
                        color={Color.Green}
                      />
                    </List.Item.Detail.Metadata.TagList>
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Go Back"
                  onAction={onBack}
                  icon={Icon.ArrowLeft}
                />
                <Action.CopyToClipboard title="Copy Query" content={query} />
              </ActionPanel>
            }
          />
        ) : (
          sortedIssues.map((issue, index) => {
            const config = SEVERITY_CONFIG[issue.severity];
            return (
              <List.Item
                key={index}
                title={issue.message}
                subtitle={issue.suggestion}
                icon={{ source: config.icon, tintColor: config.color }}
                accessories={[
                  { tag: { value: config.label, color: config.color } },
                ]}
                detail={<IssueDetail issue={issue} />}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      {issue.suggestion && (
                        <Action.CopyToClipboard
                          title="Copy Suggestion"
                          content={issue.suggestion}
                          shortcut={{ modifiers: ["cmd"], key: "c" }}
                        />
                      )}
                      <Action
                        title="Go Back"
                        onAction={onBack}
                        icon={Icon.ArrowLeft}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action.CopyToClipboard
                        title="Copy Original Query"
                        content={query}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })
        )}
      </List.Section>

      <List.Section title="Query">
        <List.Item
          title={result.parsedTable || "Unknown table"}
          subtitle={result.parsedColumns?.join(", ") || ""}
          icon={Icon.Document}
          accessories={[{ text: "Parsed from query" }]}
          detail={
            <List.Item.Detail
              markdown={`\`\`\`sql\n${query}\n\`\`\``}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Table"
                    text={result.parsedTable || "Unknown"}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Columns"
                    text={result.parsedColumns?.join(", ") || "*"}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action title="Go Back" onAction={onBack} icon={Icon.ArrowLeft} />
              <Action.CopyToClipboard title="Copy Query" content={query} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

export default function ValidateQuery() {
  const preferences = getPreferenceValues<Preferences>();
  const platform = preferences.defaultPlatform || "darwin";
  const { push, pop } = useNavigation();

  const [query, setQuery] = useState("");
  const [clipboardLoaded, setClipboardLoaded] = useState(false);

  // Try to load from clipboard on mount
  useEffect(() => {
    async function loadClipboard() {
      try {
        const text = await Clipboard.readText();
        if (text && /^\s*select\b/i.test(text)) {
          setQuery(text);
        }
      } catch {
        // Ignore clipboard errors
      }
      setClipboardLoaded(true);
    }
    loadClipboard();
  }, []);

  function handleSubmit() {
    if (!query.trim()) return;

    const result = validateQuery(query, platform);
    push(
      <ValidationResults query={query} result={result} onBack={() => pop()} />,
    );
  }

  if (!clipboardLoaded) {
    return <Form isLoading />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Validate Query"
            onSubmit={handleSubmit}
            icon={Icon.Checkmark}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="query"
        title="SQL Query"
        placeholder="SELECT * FROM processes WHERE name = 'Finder';"
        value={query}
        onChange={setQuery}
        info="Paste your osquery SQL query here"
      />

      <Form.Description
        title="Platform"
        text={`Validating for: ${platform === "darwin" ? "macOS" : platform === "linux" ? "Linux" : platform === "windows" ? "Windows" : "All Platforms"}`}
      />

      <Form.Description
        title="Validation Checks"
        text="• Table exists in schema\n• Columns exist in table\n• Required WHERE columns present\n• Platform compatibility\n• Best practices (LIMIT, SELECT *)"
      />
    </Form>
  );
}
