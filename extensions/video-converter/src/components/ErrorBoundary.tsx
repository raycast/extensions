import React from "react";
import { ActionPanel, Action, List } from "@raycast/api";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <List>
          <List.Section title="⚠️ An error occurred">
            <List.Item
              title={this.state.error?.message || "Unknown error"}
              accessories={[{ text: "Click to reload" }]}
              actions={
                <ActionPanel>
                  <Action title="Reload Extension" onAction={() => window.location.reload()} />
                </ActionPanel>
              }
            />
          </List.Section>
        </List>
      );
    }

    return this.props.children;
  }
}
