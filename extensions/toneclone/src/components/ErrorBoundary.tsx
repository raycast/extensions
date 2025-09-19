import { Detail, Action, ActionPanel, Icon } from "@raycast/api";
import React, { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary component to catch and display errors gracefully
 */
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
      const title = this.props.fallbackTitle || "Something went wrong";
      const errorMessage = this.state.error?.message || "An unexpected error occurred";

      return (
        <Detail
          markdown={`# ${title}

${errorMessage}

Please try again or contact support if the problem persists.

**Error Details:**
\`\`\`
${this.state.error?.stack || "No stack trace available"}
\`\`\`
`}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                onAction={() => this.setState({ hasError: false, error: undefined })}
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(Component: React.ComponentType<P>, fallbackTitle?: string) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallbackTitle={fallbackTitle}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
