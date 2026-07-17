import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  List,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import PiecesPreflightService, {
  PreflightErrorType,
} from "../../connection/health/piecesPreflightCheck";

interface PreflightResult {
  healthy: boolean;
  authenticated: boolean;
  error?: PreflightErrorType;
}

interface UsePiecesPreflightCheckOptions {
  /** Custom context for the description (e.g., "materials", "snippets", "browser history") */
  context?: string;
}

export function usePiecesPreflightCheck(
  options: UsePiecesPreflightCheckOptions = {},
) {
  const [preflightResult, setPreflightResult] =
    useState<PreflightResult | null>(null);
  const { context = "data" } = options;

  useEffect(() => {
    async function checkHealth() {
      const service = PiecesPreflightService.getInstance();
      try {
        const result = await service.performCheck();
        setPreflightResult(result);
      } catch (error) {
        setPreflightResult({
          healthy: false,
          authenticated: false,
          error: PreflightErrorType.NOT_INSTALLED,
        });
      }
    }
    checkHealth();
  }, []);

  const retryCheck = async () => {
    const service = PiecesPreflightService.getInstance();
    try {
      const result = await service.performCheck();
      setPreflightResult(result);
    } catch (error) {
      setPreflightResult({
        healthy: false,
        authenticated: false,
        error: PreflightErrorType.NOT_INSTALLED,
      });
    }
  };

  // Show loading state while checking
  if (!preflightResult) {
    return {
      isReady: false,
      renderUI: () => (
        <List>
          <List.EmptyView
            title="Checking Pieces..."
            description="Please wait while we verify your setup"
            icon={{ source: "loadingCat.png" }}
          />
        </List>
      ),
    };
  }

  // Show error states with specific actions
  if (!preflightResult.healthy) {
    if (preflightResult.error === PreflightErrorType.NOT_INSTALLED) {
      return {
        isReady: false,
        renderUI: () => (
          <List>
            <List.EmptyView
              title="Please install PiecesOS"
              description="PiecesOS needs to be installed and running to use this extension"
              icon={{ source: "piecesVector.png" }}
              actions={
                <ActionPanel>
                  <Action title="Install PiecesOS" onAction={retryCheck} />
                </ActionPanel>
              }
            />
          </List>
        ),
      };
    }

    if (preflightResult.error === PreflightErrorType.NEEDS_UPDATE) {
      return {
        isReady: false,
        renderUI: () => (
          <List>
            <List.EmptyView
              title="Please update PiecesOS"
              description="PiecesOS needs to be updated to use this extension"
              icon={{ source: "piecesVector.png" }}
              actions={
                <ActionPanel>
                  <Action title="Update PiecesOS" onAction={retryCheck} />
                </ActionPanel>
              }
            />
          </List>
        ),
      };
    }

    // Generic error state
    return {
      isReady: false,
      renderUI: () => (
        <List>
          <List.EmptyView
            title="Connection Error"
            description="Unable to connect to PiecesOS"
            icon={{ source: "piecesVector.png" }}
            actions={
              <ActionPanel>
                <Action title="Retry" onAction={retryCheck} />
              </ActionPanel>
            }
          />
        </List>
      ),
    };
  }

  // Show authentication required state
  if (!preflightResult.authenticated) {
    return {
      isReady: false,
      renderUI: () => (
        <List>
          <List.EmptyView
            title="Sign In Required"
            description={`Please sign in to your Pieces account to access your ${context}`}
            icon={{ source: "piecesVector.png" }}
            actions={
              <ActionPanel>
                <Action
                  title="Sign In to Pieces"
                  onAction={() => {
                    launchCommand({
                      name: "signin",
                      type: LaunchType.UserInitiated,
                    });
                  }}
                />
              </ActionPanel>
            }
          />
        </List>
      ),
    };
  }

  // All checks passed
  return {
    isReady: true,
    renderUI: () => null,
  };
}
