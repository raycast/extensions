import React from "react";
import { List } from "@raycast/api";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <List>
        <List.EmptyView
          icon="⚠️"
          title="Something went wrong"
          description={
            this.state.error?.message || "An unexpected error occurred"
          }
        />
      </List>
    );
  }
}
