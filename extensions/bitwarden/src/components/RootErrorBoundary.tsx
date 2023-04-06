import { environment, showToast, Toast } from "@raycast/api";
import { Component, ErrorInfo, ReactNode } from "react";
import TroubleshootingGuide from "~/components/TroubleshootingGuide";
import { ERRORS } from "~/constants/general";

type Props = {
  children?: ReactNode;
};

type State = {
  hasError: boolean;
  error?: string;
};

export default class RootErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (error.name in ERRORS) {
      this.setState((state) => ({ ...state, hasError: true, error: error.message }));
      showToast(Toast.Style.Failure, error.message);
    } else {
      if (environment.isDevelopment) {
        this.setState((state) => ({ ...state, hasError: true, error: error.message }));
      }
      console.error("Error:", error, errorInfo);
    }
  }

  render() {
    try {
      if (this.state.hasError) return <TroubleshootingGuide errorInfo={this.state.error} />;
      return this.props.children;
    } catch {
      return <TroubleshootingGuide />;
    }
  }
}

export class CLINotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = ERRORS.CLINotFound;
  }
}
