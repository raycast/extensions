/**
 * Error boundary component for catching and displaying React errors.
 */

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { uiLogger } from "../utils";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Error boundary that catches React errors and displays a fallback UI.
 * Integrates with the centralized logging system for error tracking.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error with context
    uiLogger.error("React error boundary caught error", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    this.setState({ errorInfo });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo } = this.state;
      const errorDetails = [
        "# An Error Occurred",
        "",
        "Something went wrong while rendering this view.",
        "",
        "## Error Message",
        "```",
        error?.message ?? "Unknown error",
        "```",
        "",
        error?.stack ? ["## Stack Trace", "```", error.stack, "```", ""].join("\n") : "",
        errorInfo?.componentStack ? ["## Component Stack", "```", errorInfo.componentStack, "```"].join("\n") : "",
      ].join("\n");

      return (
        <Detail
          markdown={errorDetails}
          actions={
            <ActionPanel>
              <Action
                title="Reload"
                icon={Icon.ArrowClockwise}
                onAction={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
              />
              <Action.CopyToClipboard title="Copy Error Details" content={errorDetails} />
            </ActionPanel>
          }
        />
      );
    }

    return this.props.children;
  }
}
