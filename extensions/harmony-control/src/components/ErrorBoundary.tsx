import React from "react";
import { List, Icon } from "@raycast/api";
import { Logger } from "../services/logger";
import { ErrorCategory } from "../types/errors";
import { FeedbackState, ErrorStates } from "./FeedbackState";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Error boundary component to catch and handle errors in the component tree.
 * Displays user-friendly error messages and logs errors for debugging.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    Logger.error("Component error caught by boundary", {
      error,
      componentStack: errorInfo.componentStack,
      category: ErrorCategory.UI,
    });
  }

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <FeedbackState
          {...ErrorStates.GENERAL_ERROR}
          description={`An unexpected error occurred: ${this.state.error.message}`}
        />
      );
    }

    return this.props.children;
  }
}
