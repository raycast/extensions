import { List, ActionPanel, Action, openCommandPreferences, popToRoot, Icon } from "@raycast/api";
import { useState, useEffect } from "react";

interface FavResolutionEmptyViewProps {
  isResizing?: boolean;
  isInvalidSize?: boolean;
}

type ViewState = "invalid" | "resizing" | "empty" | "initializing";

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
    if (!isInitialized) return "initializing";
    if (isInvalidSize) return "invalid";
    if (isResizing) return "resizing";
    return "empty";
  };

  const getViewConfig = (state: ViewState) => {
    const configs = {
      invalid: {
        icon: "icons/fav-size-invalid.svg",
        title: "Invalid or Missing Size Value",
        description: "Set positive numbers for both width and height.",
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
      initializing: {
        icon: "icons/fav-size-empty.svg",
        title: "Loading...",
        description: "",
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
                icon={Icon.Gear}
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
