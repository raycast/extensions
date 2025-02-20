import { Component, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Error boundary component to catch and handle errors in the component tree.
 * Displays user-friendly error messages and logs errors for debugging.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.error("Error caught by boundary:", error);
  }

  render(): ReactNode {
    if (this.state.error) {
      return <div>An unexpected error occurred: {this.state.error.message}</div>;
    }

    return this.props.children;
  }
}
