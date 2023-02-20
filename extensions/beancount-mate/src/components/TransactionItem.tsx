import React, { useMemo } from "react";
import { Action, ActionPanel, Color, List, Icon } from "@raycast/api";
import { NParseResult } from "costflow/lib/interface";
import { appendDirectivesToJournalFile } from "../utils/journalFile";

const TransactionItem: React.FC<{
  parseResult: { json: NParseResult.TransactionResult; data: NParseResult.Result };
  onSaveSuccess: () => void;
  isJournalFileExists?: boolean;
}> = ({ parseResult, onSaveSuccess, isJournalFileExists }) => {
  const icon = useMemo(
    () =>
      parseResult.json.directive === "transaction"
        ? parseResult.json.completed
          ? { tooltip: "Completed transaction", value: { source: Icon.Checkmark, tintColor: Color.Green } }
          : { tooltip: "Incomplete transaction", value: { source: Icon.ExclamationMark, tintColor: Color.Red } }
        : { tooltip: "Incomplete transaction", value: { source: Icon.Info, tintColor: Color.Blue } },
    [parseResult]
  );

  const itemTitle = useMemo(() => {
    if (parseResult.json.directive === "transaction") {
      return parseResult.json.payee;
    }

    return parseResult.json.data;
  }, [parseResult]);

  const markdownContent = useMemo(
    () => `# ${parseResult.json.directive}\n \`\`\`beancount\n ${parseResult.data.output} \n\`\`\``,
    [parseResult]
  );

  return (
    <List.Item
      icon={icon}
      title={itemTitle}
      accessories={[{ text: parseResult.json.narration }]}
      detail={
        <List.Item.Detail
          markdown={markdownContent}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Directive" text={parseResult.json.directive} />
              {Array.isArray(parseResult.json.data) && (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Target Account"
                    text={
                      parseResult.json.data?.find?.(
                        (item: { amount: number; account: string; currency: string }) => item.amount > 0
                      )?.account
                    }
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Expense Account"
                    text={
                      parseResult.json.data?.find?.(
                        (item: { amount: number; account: string; currency: string }) => item.amount < 0
                      )?.account
                    }
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Commodity" text={parseResult.json.data[0]?.currency} />
                </>
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {isJournalFileExists && (
            <Action
              title="Save to Journal File"
              icon={Icon.Receipt}
              onAction={() => appendDirectivesToJournalFile(parseResult.data.output ?? "").then(onSaveSuccess)}
            />
          )}
          <Action.CopyToClipboard title="Copy Parsed Directives" content={parseResult.data.output ?? ""} />
        </ActionPanel>
      }
    />
  );
};

export default TransactionItem;
