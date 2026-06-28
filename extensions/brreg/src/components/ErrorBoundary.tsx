import React, { Component, ErrorInfo, ReactNode } from "react";
import { List, ActionPanel, Action } from "@raycast/api";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <List>
          <List.Item
            title="Something went wrong"
            subtitle="An error occurred while rendering this component"
            accessories={[{ text: this.state.error?.message || "Unknown error" }]}
            actions={
              <ActionPanel>
                <Action title="Reload Extension" onAction={() => window.location.reload()} />
              </ActionPanel>
            }
          />
        </List>
      );
    }

    return this.props.children;
  }
}
