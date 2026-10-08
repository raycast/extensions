import {
  ActionPanel,
  Action,
  Icon,
  Keyboard,
  showToast,
  Toast,
  List,
  LaunchProps,
} from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import React, { useEffect, useState } from "react";
import Graph from "./components/Graph";

interface CommandArguments {
  operation?: string;
}

export default function Command(
  props: LaunchProps<{ arguments: CommandArguments }>,
) {
  const { operation } = props.arguments;
  const [expression, setExpression] = useState<string>("");
  const [graphMode, setGraphMode] = useState<boolean>(!!operation); // Start in graphMode if operation is provided
  const [, setLoading] = useState<boolean>(!!operation);
  const {
    value: history,
    setValue: setHistory,
    isLoading: isHistoryLoading,
  } = useLocalStorage<string[]>("history", []);
  const [historyInitialized, setHistoryInitialized] = useState(false);
  const [renderHistorySorted, setRenderHistorySorted] = useState<string[]>([]);

  const renderHistory = history || [];

  useEffect(() => {
    const currentHistory = history || [];
    setRenderHistorySorted([...currentHistory].sort());
  }, [history]);

  const updateHistory = (expression: string) => {
    setHistory([expression, ...renderHistory.slice(0, 100)]);
  };

  const submit = async (expression: string) => {
    setLoading(true);
    showToast({
      style: Toast.Style.Animated,
      title: "Loading",
      message: "Please wait while the graph is being prepared...",
    });

    updateHistory(expression);
    setGraphMode(true);
    setLoading(false);
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

  const handleClearHistory = () => {
    setHistory([]);
    showToast({
      style: Toast.Style.Success,
      title: "History Cleared",
      message: "The history has been successfully cleared.",
    });
  };

  const handleDeleteFromHistory = (expr: string) => {
    setHistory(renderHistory.filter((e) => e !== expr));
    showToast({
      style: Toast.Style.Success,
      title: "Removed from History",
      message: expr,
    });
  };

  const handleEditExpression = (expr: string) => {
    setExpression(expr);
  };

  useEffect(() => {
    if (!isHistoryLoading && !historyInitialized) {
      setHistoryInitialized(true);
      setLoading(!!operation);
      if (operation && !expression) {
        setExpression(operation);
        submit(operation);
      }
    }
  }, [isHistoryLoading, historyInitialized, operation, expression]);

  if (!historyInitialized) {
    return (
      <List
        isLoading={true}
        searchBarPlaceholder="Loading..."
        searchText={expression}
        onSearchTextChange={(text) => setExpression(text)}
      />
    );
  }

  const isEmpty = expression.trim() !== "";

  const filteredHistory = isEmpty
    ? renderHistorySorted.filter((expr) => {
        return (
          expr.trim() !== "" && expr !== expression && expr.includes(expression)
        );
      })
    : [...renderHistory, expression].filter(
        (value, index, self) =>
          value.trim() !== "" && self.indexOf(value) === index,
      );

  return graphMode ? (
    <Graph expression={expression} />
  ) : (
    <List
      searchBarPlaceholder="Enter an equation or expression (e.g., sin(x))"
      onSearchTextChange={(text) => setExpression(text || "")} // Ensure text is always a string
      searchText={expression} // Ensure searchText is always defined
    >
      {isEmpty && (
        <List.Item
          key="new"
          title={expression}
          actions={
            <ActionPanel>
              <Action title="Plot Graph" onAction={handleSubmit} />
              <ActionPanel.Section title="History">
                <Action
                  title="Clear History"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={handleClearHistory}
                />
              </ActionPanel.Section>
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
              <ActionPanel.Section>
                <Action
                  title="Plot Graph"
                  onAction={() => handleSelect(expr)}
                />
                <Action
                  title="Edit Expression"
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  onAction={() => handleEditExpression(expr)}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="History">
                <Action
                  title="Delete from History"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  // Raycast's standard remove shortcut: ⌃X on macOS, Ctrl+D on Windows.
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => handleDeleteFromHistory(expr)}
                />
                <Action
                  title="Clear History"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={handleClearHistory}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
