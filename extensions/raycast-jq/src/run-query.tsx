import { Action, ActionPanel, Clipboard, Icon, Keyboard, List } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useMemo, useState } from "react";
import { ActionPickFile as ActionPickDocument } from "./components/ActionPickFile";
import { useJq } from "./hooks/useJq";

import { readFile } from "fs/promises";

// TODO: See how details are implemented in the Multitranslator extension
// TODO: Check how it works without internet connection

const parseJqError = (errorMessage: string, jsonDocument?: string) => {
  const [error, errorDetails, ...rest] = errorMessage.split("\n").slice(1);
  if (error.match(/syntax error/)) {
    return `The query \`${errorDetails.trim()}\` is invalid.`;
  }

  if (error.search(/parse error/)) {
    // jq: parse error: Invalid numeric literal at line 2, column 12
    let message = `The document is not a valid JSON document. `;
    const match = /line (\d+), column (\d+)/.exec(error);
    if (match && jsonDocument) {
      const [location, lineStr, colStr] = match;
      const lineNo = parseInt(lineStr) - 1;
      const colNo = parseInt(colStr) - 1;
      const fragment = jsonDocument.split("\n")[lineNo].slice(colNo - 100, colNo + 100);
      message += ` The error is at ${location} around \`${fragment}\``;
    }
    return message;
  }

  let message = "The error is unknown. ";
  message += `The error message is:\n\n\`\`\`\n${[errorDetails, ...rest].join("\n")}\n\`\`\``;

  return message;
};

const getDetailsContent = (
  isLoading: boolean,
  jsonDocument: string | undefined,
  queryError: Error | undefined,
  queryResult: string | undefined,
) => {
  if (isLoading) return "## Spinning gears... ⌛";
  if (!jsonDocument)
    return "## No JSON document to query 🤷‍♀️\n\nOpen (⌘ + O) or paste (⌘ + V) document from clipboard";
  if (queryError)
    return "## Can't query document 🙍‍♀️\n\n" + parseJqError(queryError.message, jsonDocument);
  if (queryResult) {
    let result = queryResult;
    let subResult = "";
    if (result.length > 5000) {
      result = result.substring(0, 5000);
      subResult =
        "\n" +
        "Rest of the result is truncated for performance reasons.\n" +
        'Use "Copy To Clipboard" action to get the full result)';
    }
    return "```json\n" + result + "\n```" + subResult;
  }

  return "Type a query to see the result";
};

export default function Command() {
  const [query, setQuery] = useState<string>("");
  const [jsonDocument, setJsonDocument] = useState<string>();
  const [loadJsonDocument, pasteJsonDocument] = useMemo(() => {
    const initDocument = (docContent?: string) => {
      setJsonDocument(docContent);
      setQuery(".");
    };

    const pasteJsonDocument = () => Clipboard.readText().then(initDocument);
    const loadJsonDocument = (fileName: string | null) => {
      if (fileName !== null) {
        readFile(fileName, "utf-8").then(initDocument);
      }
    };
    return [loadJsonDocument, pasteJsonDocument];
  }, [setQuery, setJsonDocument]);

  // Check if jq is available
  const { isLoading: isCheckingJq, data: jqPath } = useJq();

  // Execute the query, when all prerequisites are met
  const {
    isLoading: isRunningQuery,
    data: queryResult,
    error: queryError,
  } = useExec(jqPath!, [query], {
    input: jsonDocument,
    initialData: jsonDocument,
    keepPreviousData: true,
    execute: !!(jqPath && jsonDocument && query !== ""),
    failureToastOptions: {
      title: "Query error",
      message: "Check the query syntax and try again.",
    },
  });

  const listActions = useMemo(() => {
    const actionPickDocument = (
      <ActionPickDocument
        title="Open Json file"
        type="public.json"
        icon={Icon.Folder}
        onSelect={loadJsonDocument}
        shortcut={Keyboard.Shortcut.Common.Open}
        key="actionPickDocument"
      />
    );

    const actionPasteDocument = (
      <Action
        title="Paste Json from Clipboard"
        icon={Icon.Clipboard}
        onAction={pasteJsonDocument}
        shortcut={{ key: "v", modifiers: ["cmd"] }}
        key="actionPasteDocument"
      />
    );

    const actionCopyResult = (
      <Action.CopyToClipboard title="Copy Result" content={queryResult} key="actionCopyResult" />
    );
    const actionCopyQuery = (
      <Action.CopyToClipboard title="Copy Query" content={query} key="actionCopyQuery" />
    );

    const actions = [actionPickDocument, actionPasteDocument];
    if (queryResult) {
      actions.unshift(actionCopyResult, actionCopyQuery);
    }

    return <ActionPanel title="Actions">{actions}</ActionPanel>;
  }, [query, queryResult, loadJsonDocument, pasteJsonDocument]);

  const isLoading = isCheckingJq || isRunningQuery;
  const detailsContent = getDetailsContent(isCheckingJq, jsonDocument, queryError, queryResult);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={!!jsonDocument}
      searchText={query}
      onSearchTextChange={setQuery}
      throttle={true}
      actions={listActions}
      searchBarPlaceholder="Enter query..."
    >
      {jsonDocument ? (
        <List.Item
          title="Current document"
          detail={<List.Item.Detail markdown={detailsContent} />}
          actions={listActions}
        />
      ) : (
        <List.EmptyView
          icon="icon-64-no-content.png"
          description="No document opened. Open JSON file (⌘ + O) or paste document from clipboard (⌘ + V)"
        />
      )}
    </List>
  );
}
