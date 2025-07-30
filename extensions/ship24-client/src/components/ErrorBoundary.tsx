import React, { Component, ReactNode } from "react";
import { Detail, Action, ActionPanel } from "@raycast/api";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Detail
          markdown={`# Application Error

An unexpected error occurred:

\`\`\`
${this.state.error?.message || "Unknown error"}
\`\`\`

Please try restarting the application or contact support if the problem persists.

**Stack trace:**
\`\`\`
${this.state.error?.stack || "No stack trace available"}
\`\`\``}
          actions={
            <ActionPanel>
              <Action
                title="Reload"
                onAction={() => {
                  this.setState({ hasError: false, error: undefined });
                }}
              />
            </ActionPanel>
          }
        />
      );
    }

    return this.props.children;
  }
}
