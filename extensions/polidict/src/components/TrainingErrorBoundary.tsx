import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class TrainingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Detail
          navigationTitle="Training Error"
          markdown={`# Something went wrong\n\nAn error occurred during training.\n\n**Error:** ${this.state.error?.message ?? "Unknown error"}`}
          actions={
            <ActionPanel>
              <Action
                title="Try Again"
                icon={Icon.ArrowClockwise}
                onAction={() => this.setState({ hasError: false, error: undefined })}
              />
            </ActionPanel>
          }
        />
      );
    }

    return this.props.children;
  }
}
