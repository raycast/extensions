import { Action, ActionPanel, Form, LaunchProps, List, useNavigation } from "@raycast/api";
import { useState } from "react";

import { buildSummaryText, compareLists, ComparisonResult, CompareFormValues, parseList } from "./lib/compare";

type ComparisonResultsViewProps = {
  result: ComparisonResult;
};

type ResultActionsProps = {
  primaryTitle: string;
  primaryContent: string;
  onlyInAContent: string;
  onlyInBContent: string;
  inBothContent: string;
  fullReport: string;
};

export default function CompareListsCommand(props: LaunchProps<{ draftValues: CompareFormValues }>) {
  const { push } = useNavigation();
  const [values, setValues] = useState<CompareFormValues>({
    listA: props.draftValues?.listA ?? "",
    listB: props.draftValues?.listB ?? "",
    caseSensitive: props.draftValues?.caseSensitive ?? false,
  });
  const [listAError, setListAError] = useState<string>();
  const [listBError, setListBError] = useState<string>();

  function clearErrors() {
    setListAError(undefined);
    setListBError(undefined);
  }

  function handleSubmit(submittedValues: CompareFormValues) {
    const parsedA = parseList(submittedValues.listA, submittedValues.caseSensitive);
    const parsedB = parseList(submittedValues.listB, submittedValues.caseSensitive);

    if (parsedA.uniqueCount === 0 && parsedB.uniqueCount === 0) {
      const errorMessage = "Enter at least one item in List A or List B";
      setListAError(errorMessage);
      setListBError(errorMessage);
      return;
    }

    clearErrors();
    push(
      <ComparisonResultsView
        result={compareLists(submittedValues.listA, submittedValues.listB, submittedValues.caseSensitive)}
      />,
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Compare Lists" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      enableDrafts
    >
      <Form.TextArea
        id="listA"
        title="List A"
        placeholder="One item per line"
        value={values.listA}
        onChange={(listA) => {
          setValues((currentValues) => ({ ...currentValues, listA }));
          clearErrors();
        }}
        error={listAError}
      />
      <Form.TextArea
        id="listB"
        title="List B"
        placeholder="One item per line"
        value={values.listB}
        onChange={(listB) => {
          setValues((currentValues) => ({ ...currentValues, listB }));
          clearErrors();
        }}
        error={listBError}
      />
      <Form.Checkbox
        id="caseSensitive"
        label="Case Sensitive"
        value={values.caseSensitive}
        onChange={(caseSensitive) => {
          setValues((currentValues) => ({ ...currentValues, caseSensitive }));
          clearErrors();
        }}
      />
    </Form>
  );
}

function ComparisonResultsView({ result }: ComparisonResultsViewProps) {
  const summaryContent = buildSummaryText(result);
  const onlyInAContent = result.onlyInA.join("\n");
  const onlyInBContent = result.onlyInB.join("\n");
  const inBothContent = result.inBoth.join("\n");
  const fullReport = [
    summaryContent,
    "",
    buildReportSection("Only in List A", result.onlyInA),
    "",
    buildReportSection("Only in List B", result.onlyInB),
    "",
    buildReportSection("In Both Lists", result.inBoth),
  ].join("\n");

  return (
    <List
      navigationTitle="Comparison Results"
      isShowingDetail
      searchBarPlaceholder="Select Summary, List A, List B, or Shared Items"
    >
      <List.Item
        title="Summary"
        detail={<List.Item.Detail markdown={buildSummaryMarkdown(result)} />}
        actions={
          <ResultActions
            primaryTitle="Copy Summary"
            primaryContent={summaryContent}
            onlyInAContent={onlyInAContent}
            onlyInBContent={onlyInBContent}
            inBothContent={inBothContent}
            fullReport={fullReport}
          />
        }
      />
      <List.Item
        title="Only in List A"
        subtitle={formatItemCount(result.onlyInA.length)}
        detail={
          <List.Item.Detail
            markdown={buildItemsMarkdown("Only in List A", result.onlyInA, "No unique items were found only in List A")}
          />
        }
        actions={
          <ResultActions
            primaryTitle="Copy A-Only Items"
            primaryContent={onlyInAContent}
            onlyInAContent={onlyInAContent}
            onlyInBContent={onlyInBContent}
            inBothContent={inBothContent}
            fullReport={fullReport}
          />
        }
      />
      <List.Item
        title="Only in List B"
        subtitle={formatItemCount(result.onlyInB.length)}
        detail={
          <List.Item.Detail
            markdown={buildItemsMarkdown("Only in List B", result.onlyInB, "No unique items were found only in List B")}
          />
        }
        actions={
          <ResultActions
            primaryTitle="Copy B-Only Items"
            primaryContent={onlyInBContent}
            onlyInAContent={onlyInAContent}
            onlyInBContent={onlyInBContent}
            inBothContent={inBothContent}
            fullReport={fullReport}
          />
        }
      />
      <List.Item
        title="In Both Lists"
        subtitle={formatItemCount(result.inBoth.length)}
        detail={
          <List.Item.Detail
            markdown={buildItemsMarkdown("In Both Lists", result.inBoth, "No shared items were found in both lists")}
          />
        }
        actions={
          <ResultActions
            primaryTitle="Copy Shared Items"
            primaryContent={inBothContent}
            onlyInAContent={onlyInAContent}
            onlyInBContent={onlyInBContent}
            inBothContent={inBothContent}
            fullReport={fullReport}
          />
        }
      />
    </List>
  );
}

function ResultActions({
  primaryTitle,
  primaryContent,
  onlyInAContent,
  onlyInBContent,
  inBothContent,
  fullReport,
}: ResultActionsProps) {
  return (
    <ActionPanel>
      <Action.CopyToClipboard
        title={primaryTitle}
        content={primaryContent}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
      <Action.CopyToClipboard
        title="Copy A-Only Items"
        content={onlyInAContent}
        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
      />
      <Action.CopyToClipboard
        title="Copy B-Only Items"
        content={onlyInBContent}
        shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
      />
      <Action.CopyToClipboard
        title="Copy Shared Items"
        content={inBothContent}
        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      />
      <Action.CopyToClipboard
        title="Copy Full Report"
        content={fullReport}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      />
    </ActionPanel>
  );
}

function buildSummaryMarkdown(result: ComparisonResult) {
  return ["# Summary", "", "```text", buildSummaryText(result), "```"].join("\n");
}

function buildItemsMarkdown(title: string, items: string[], emptyMessage: string) {
  if (items.length === 0) {
    return [`# ${title}`, "", `Count: ${items.length}`, "", `_${emptyMessage}_`].join("\n");
  }

  return [`# ${title}`, "", `Count: ${items.length}`, "", "```text", items.join("\n"), "```"].join("\n");
}

function formatItemCount(count: number) {
  return `${count} item${count === 1 ? "" : "s"}`;
}

function buildReportSection(title: string, items: string[]) {
  if (items.length === 0) {
    return `${title}:\nNone`;
  }

  return `${title}:\n${items.join("\n")}`;
}
