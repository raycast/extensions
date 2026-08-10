import type { ErrorInfo, ReactNode } from "react";
import { Component, createContext, useContext, useEffect } from "react";

import { Toast, showToast } from "@raycast/api";

import TroubleshootingGuide from "@/pages/components/troubleshooting-guide";

// import { APIError, InvalidTokenError } from "@/utils/error";

export interface IErrorBoundaryContext {
  throwError: (error: Error) => void;
}

const ErrorBoundaryContext = createContext<IErrorBoundaryContext>(null as unknown as IErrorBoundaryContext);

export const useErrorBoundary = () => useContext(ErrorBoundaryContext);

type Props = {
  children?: ReactNode;
};

type State = {
  hasError: boolean;
  thrownError?: Error;
  error?: string;
};

const MiniBoundary = ({ error, children }: { error?: Error; children: ReactNode }) => {
  useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);
  return children;
};

export class ErrorBoundaryProvider extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState((state) => ({ ...state, hasError: true, error: error.message }));
    await showToast(Toast.Style.Failure, error.message);
    console.error("Error:", error, errorInfo);
  }

  throwError = (error: Error) => {
    this.setState((state) => ({ ...state, thrownError: error }));
  };

  withProvider = (children: ReactNode) => {
    return (
      <ErrorBoundaryContext.Provider value={{ throwError: this.throwError }}>
        <MiniBoundary error={this.state.hasError ? undefined : this.state.thrownError}>{children}</MiniBoundary>
      </ErrorBoundaryContext.Provider>
    );
  };

  render() {
    try {
      if (this.state.hasError) {
        return this.withProvider(<TroubleshootingGuide errorInfo={this.state.error} />);
      }
      return this.withProvider(this.props.children);
    } catch {
      return this.withProvider(<TroubleshootingGuide />);
    }
  }
}
