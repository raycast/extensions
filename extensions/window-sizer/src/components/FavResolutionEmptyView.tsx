import { List, ActionPanel, Action, openCommandPreferences, popToRoot } from "@raycast/api";
import { useState, useEffect } from "react";

interface FavResolutionEmptyViewProps {
  isResizing?: boolean;
  isInvalidSize?: boolean;
}

type ViewState = "invalid" | "resizing" | "empty";

export function FavResolutionEmptyView({ isResizing = false, isInvalidSize = false }: FavResolutionEmptyViewProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Provide a very short delay to ensure state stability
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const getViewState = (): ViewState => {
    if (!isInitialized) return "empty";
    if (isInvalidSize) return "invalid";
    if (isResizing) return "resizing";
    return "empty";
  };

  const getViewConfig = (state: ViewState) => {
    const configs = {
      invalid: {
        icon: "icons/fav-size-invalid.svg",
        title: "Invalid Size Value",
        description: "Please set positive numbers for width and height in the command settings.",
      },
      resizing: {
        icon: "icons/fav-size-resizing.svg",
        title: "Resizing Window...",
        description: "",
      },
      empty: {
        icon: "icons/fav-size-empty.svg",
        title: "Set your Favorite Size first",
        description: "Press ⏎ to open the command settings.",
      },
    };
    return configs[state];
  };

  const viewState = getViewState();
  const viewConfig = getViewConfig(viewState);

  return (
    <List filtering={false} isLoading={!isInitialized}>
      <List.EmptyView
        icon={viewConfig.icon}
        title={viewConfig.title}
        description={viewConfig.description}
        actions={
          viewState !== "resizing" && (
            <ActionPanel>
              <Action
                title="Open Settings"
                onAction={async () => {
                  await openCommandPreferences();
                  await popToRoot();
                }}
              />
            </ActionPanel>
          )
        }
      />
    </List>
  );
}
