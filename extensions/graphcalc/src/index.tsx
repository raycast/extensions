import {
  ActionPanel,
  Action,
  showToast,
  useNavigation,
  Toast,
  List,
  LaunchProps,
} from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import React, { useEffect, useState } from "react";
import Graph from "./components/Graph";
import FeedbackForm from "./components/FeedbackForm";

interface CommandArguments {
  operation?: string;
}

export default function Command(
  props: LaunchProps<{ arguments: CommandArguments }>,
) {
  const { operation } = props.arguments;
  const [expression, setExpression] = useState<string>(operation || ""); // Initialize with operation if provided
  const {
    value: history,
    setValue: setHistory,
    isLoading: isHistoryLoading,
  } = useLocalStorage<string[]>("history", []);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [historyInitialized, setHistoryInitialized] = useState(false);
  const [renderHistorySorted, setRenderHistorySorted] = useState<string[]>([]);

  const renderHistory = history || [];
  const { push } = useNavigation();

  useEffect(() => {
    setRenderHistorySorted((history || []).sort());
  }, [history]);

  const updateHistory = (expression: string) => {
    setHistory([expression, ...renderHistory.slice(0, 100)]);
  };

  const submit = (expression: string) => {
    updateHistory(expression);
    push(<Graph expression={expression} />);
  };

  const handleSubmit = () => {
    if (expression.trim() === "") {
      showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: "Expression cannot be empty",
      });
      return;
    }
    submit(expression);
  };

  const handleSelect = (selectedExpression: string) => {
    setExpression(selectedExpression);
    submit(selectedExpression);
  };

  const handleCloseFeedbackForm = () => {
    setShowFeedbackForm(false);
  };

  const handleClearHistory = () => {
    setHistory([]);
    showToast({
      style: Toast.Style.Success,
      title: "History Cleared",
      message: "The history has been successfully cleared.",
    });
  };

  useEffect(() => {
    if (!isHistoryLoading && !historyInitialized) {
      setHistoryInitialized(true);
      if (operation) {
        submit(operation);
      }
    }
  }, [isHistoryLoading, historyInitialized, operation]);

  if (isHistoryLoading || !historyInitialized) {
    return (
      <List
        isLoading={true}
        searchBarPlaceholder="Loading..."
        searchText={expression}
        onSearchTextChange={(text) => setExpression(text)}
      />
    );
  }

  const filteredHistory =
    expression.trim() !== ""
      ? renderHistorySorted.filter((expr) => {
          return expr !== expression && expr.includes(expression);
        })
      : renderHistory;

  return (
    <>
      {!showFeedbackForm ? (
        <List
          searchBarPlaceholder="Enter an equation or expression (e.g., sin(x))"
          onSearchTextChange={(text) => setExpression(text || "")} // Ensure text is always a string
          searchText={expression} // Ensure searchText is always defined
        >
          {expression.trim() !== "" && (
            <List.Item
              key="new"
              title={expression}
              actions={
                <ActionPanel>
                  <Action title="Plot Graph" onAction={handleSubmit} />
                  <Action title="Clear History" onAction={handleClearHistory} />
                </ActionPanel>
              }
            />
          )}
          {filteredHistory.map((expr, index) => (
            <List.Item
              key={index}
              title={expr}
              actions={
                <ActionPanel>
                  <Action
                    title="Plot Graph"
                    onAction={() => handleSelect(expr)}
                  />
                  <Action title="Clear History" onAction={handleClearHistory} />
                </ActionPanel>
              }
            />
          ))}
        </List>
      ) : (
        <FeedbackForm onClose={handleCloseFeedbackForm} />
      )}
    </>
  );
}
