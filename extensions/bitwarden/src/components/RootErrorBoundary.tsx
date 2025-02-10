import { environment, showToast, Toast } from "@raycast/api";
import { Component, ErrorInfo, ReactNode } from "react";
import TroubleshootingGuide from "~/components/TroubleshootingGuide";
import { ManuallyThrownError } from "~/utils/errors";

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

  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (error instanceof ManuallyThrownError) {
      this.setState((state) => ({ ...state, hasError: true, error: error.message }));
      await showToast(Toast.Style.Failure, error.message);
    } else {
      if (environment.isDevelopment) {
        this.setState((state) => ({ ...state, hasError: true, error: error.message }));
      }
      console.error("Error:", error, errorInfo);
    }
  }

  render() {
    try {
      if (this.state.hasError) return <TroubleshootingGuide error={this.state.error} />;
      return this.props.children;
    } catch {
      return <TroubleshootingGuide />;
    }
  }
}
