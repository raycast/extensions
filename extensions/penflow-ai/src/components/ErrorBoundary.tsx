import React, { Component, ErrorInfo, ReactNode } from "react";
import { List, Icon } from "@raycast/api";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error details:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <List>
          <List.EmptyView
            icon={Icon.ExclamationMark}
            title="An Error Occurred"
            description={`Something went wrong. ${this.state.error?.message || "Please try again."}`}
          />
        </List>
      );
    }

    return this.props.children;
  }
}
