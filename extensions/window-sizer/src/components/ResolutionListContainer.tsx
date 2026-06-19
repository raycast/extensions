import { List, useNavigation } from "@raycast/api";
import { Resolution } from "../types";
import { ResolutionForm } from "./ResolutionForm";
import { OptionsList } from "./OptionsList";
import { CustomResolutionsList } from "./CustomResolutionsList";
import { DefaultResolutionsList } from "./DefaultResolutionsList";
import { StarredResolutionsList } from "./StarredResolutionsList";
import { useStarredResolutions } from "../hooks/useStarredResolutions";
import { useEffect, useState } from "react";
import { generateResolutionItemId } from "../utils/resolution";

interface ResolutionListContainerProps {
  isLoading: boolean;
  customResolutions: Resolution[];
  predefinedResolutions: Resolution[];
  onDeleteCustomResolution: (resolution: Resolution) => Promise<void>;
  onResizeWindow: (width: number, height: number) => Promise<void>;
  onRestorePreviousSize: () => Promise<void>;
  onGetCurrentWindowSize: () => Promise<void>;
  onCustomResolutionAdded: () => void;
  onMaximizeWindow: () => Promise<void>;
}

export function ResolutionListContainer({
  isLoading: externalIsLoading,
  customResolutions,
  predefinedResolutions,
  onDeleteCustomResolution,
  onResizeWindow,
  onRestorePreviousSize,
  onGetCurrentWindowSize,
  onCustomResolutionAdded,
  onMaximizeWindow,
}: ResolutionListContainerProps) {
  const { push } = useNavigation();
  const { starredResolutions, toggleStarResolution } = useStarredResolutions();
  const [isContentReady, setIsContentReady] = useState(false);
  const [initialSelectedItemId, setInitialSelectedItemId] = useState<string | undefined>(undefined);
  const [accessorySelectedItemId, setAccessorySelectedItemId] = useState<string | undefined>(undefined);

  // Set content ready state when external loading is complete
  useEffect(() => {
    setIsContentReady(!externalIsLoading);
  }, [externalIsLoading]);

  useEffect(() => {
    if (!isContentReady || initialSelectedItemId) {
      return;
    }

    if (starredResolutions.length > 0) {
      const firstStarred = starredResolutions[0];
      const itemId = generateResolutionItemId(
        firstStarred,
        firstStarred.isCustom ? "custom" : "default",
        "Starred Sizes",
        0,
      );
      setInitialSelectedItemId(itemId);
      setAccessorySelectedItemId(itemId);
    } else if (customResolutions.length > 0) {
      const firstCustom = customResolutions[0];
      const itemId = generateResolutionItemId(firstCustom, "custom", "Custom Sizes", 0);
      setInitialSelectedItemId(itemId);
      setAccessorySelectedItemId(itemId);
    } else if (predefinedResolutions.length > 0) {
      const firstDefault = predefinedResolutions[0];
      const itemId = generateResolutionItemId(firstDefault, "default", "Default Sizes", 0);
      setInitialSelectedItemId(itemId);
      setAccessorySelectedItemId(itemId);
    }
  }, [customResolutions, initialSelectedItemId, isContentReady, predefinedResolutions, starredResolutions]);

  const handleAddCustomResolution = async () => {
    push(
      <ResolutionForm
        onResizeWindow={onResizeWindow}
        predefinedResolutions={predefinedResolutions}
        onCustomResolutionAdded={onCustomResolutionAdded}
      />,
    );
  };

  return (
    <List
      isLoading={externalIsLoading || !isContentReady}
      searchBarPlaceholder="Search for sizes and commands..."
      navigationTitle="Resize Window"
      selectedItemId={initialSelectedItemId}
      onSelectionChange={(id) => setAccessorySelectedItemId(id || undefined)}
    >
      {isContentReady && (
        <>
          <StarredResolutionsList
            starredResolutions={starredResolutions}
            onResizeWindow={onResizeWindow}
            onToggleStar={toggleStarResolution}
            selectedItemId={accessorySelectedItemId}
          />

          <CustomResolutionsList
            customResolutions={customResolutions}
            onResizeWindow={onResizeWindow}
            onDeleteResolution={onDeleteCustomResolution}
            onToggleStar={toggleStarResolution}
            starredResolutions={starredResolutions}
            selectedItemId={accessorySelectedItemId}
          />

          <DefaultResolutionsList
            predefinedResolutions={predefinedResolutions}
            onResizeWindow={onResizeWindow}
            onToggleStar={toggleStarResolution}
            starredResolutions={starredResolutions}
            selectedItemId={accessorySelectedItemId}
          />

          <OptionsList
            onRestorePreviousSize={onRestorePreviousSize}
            onGetCurrentWindowSize={onGetCurrentWindowSize}
            onAddCustomResolution={handleAddCustomResolution}
            onMaximizeWindow={onMaximizeWindow}
          />
        </>
      )}
    </List>
  );
}
