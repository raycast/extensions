import React from "react";
import { Detail } from "@raycast/api";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary component to catch and handle React errors
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Detail
          markdown={`# Error Occurred\n\nSomething went wrong in the extension.\n\n\`\`\`\n${
            this.state.error?.message || "Unknown error"
          }\n\`\`\`\n\nPlease try again or report this issue.`}
        />
      );
    }

    return this.props.children;
  }
}
