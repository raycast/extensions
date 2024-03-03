import React from "react";
import { environment } from "@raycast/api";

import { ErrorScreen } from "../components";
import { ExtensionError } from "../utils";

import { useSaveRef } from "./useSaveRef";

type ErrorBoundaryWrapperProps = {
  toastErrorTitle?: string | null;
  children: React.ReactNode;
};

type ErrorBoundaryProps = ErrorBoundaryWrapperProps & {
  error: Error | null;
  onDidCatch: (err: Error, errorInfo: React.ErrorInfo) => void;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps> {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onDidCatch(error, errorInfo);

    if (environment.isDevelopment) {
      console.error(error, errorInfo);
    }

    if (!(error instanceof ExtensionError)) {
      throw error;
    }
  }

  render() {
    const { error, children, toastErrorTitle } = this.props;

    if (error) {
      return <ErrorScreen error={error} errorToast={toastErrorTitle} />;
    }

    return children;
  }
}

export const useErrorBoundary = (externalError?: Error | null) => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => setError(null), [setError]);
  const onDidCatch = React.useCallback(
    (error: Error) => {
      setError(error);
    },
    [setError],
  );

  const boundaryWrapper = React.useRef<React.FC<ErrorBoundaryWrapperProps> | null>(null);
  const errorRef = useSaveRef(error);

  React.useEffect(() => {
    if (externalError !== null && externalError !== undefined) {
      setError(externalError);
    }
  }, [externalError]);

  const getWrapper = () => {
    if (boundaryWrapper.current === null) {
      boundaryWrapper.current = function ErrorBoundaryWrapper(props: ErrorBoundaryWrapperProps) {
        return (
          <ErrorBoundary {...props} error={errorRef.current} onDidCatch={onDidCatch}>
            {props.children}
          </ErrorBoundary>
        );
      };
    }

    return boundaryWrapper.current;
  };

  return {
    ErrorBoundary: getWrapper(),
    error,
    onDidCatch,
    resetError,
  };
};
