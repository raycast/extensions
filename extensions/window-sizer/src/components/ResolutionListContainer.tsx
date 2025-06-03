import { List, useNavigation } from "@raycast/api";
import { Resolution } from "../types";
import { ResolutionForm } from "./ResolutionForm";
import { OptionsList } from "./OptionsList";
import { CustomResolutionsList } from "./CustomResolutionsList";
import { DefaultResolutionsList } from "./DefaultResolutionsList";
import { StarredResolutionsList } from "./StarredResolutionsList";
import { useStarredResolutions } from "../hooks/useStarredResolutions";
import { useState, useEffect } from "react";
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
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);
  const [isContentReady, setIsContentReady] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Set content ready state when external loading is complete
  useEffect(() => {
    setIsContentReady(!externalIsLoading);
  }, [externalIsLoading]);

  // Set selected item when content is ready
  useEffect(() => {
    if (isContentReady && !isInitialized) {
      if (starredResolutions.length > 0) {
        const firstStarred = starredResolutions[0];
        setSelectedItemId(
          generateResolutionItemId(firstStarred, firstStarred.isCustom ? "custom" : "default", "Starred Sizes", 0),
        );
      } else if (customResolutions.length > 0) {
        const firstCustom = customResolutions[0];
        setSelectedItemId(generateResolutionItemId(firstCustom, "custom", "Custom Sizes", 0));
      } else if (predefinedResolutions.length > 0) {
        const firstDefault = predefinedResolutions[0];
        setSelectedItemId(generateResolutionItemId(firstDefault, "default", "Default Sizes", 0));
      }
      setIsInitialized(true);
    }
  }, [isContentReady, isInitialized, starredResolutions, customResolutions, predefinedResolutions]);

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
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => setSelectedItemId(id || undefined)}
    >
      {isContentReady && (
        <>
          <StarredResolutionsList
            starredResolutions={starredResolutions}
            onResizeWindow={onResizeWindow}
            onToggleStar={toggleStarResolution}
            selectedItemId={selectedItemId}
          />

          <CustomResolutionsList
            customResolutions={customResolutions}
            onResizeWindow={onResizeWindow}
            onDeleteResolution={onDeleteCustomResolution}
            onToggleStar={toggleStarResolution}
            selectedItemId={selectedItemId}
            starredResolutions={starredResolutions}
          />

          <DefaultResolutionsList
            predefinedResolutions={predefinedResolutions}
            onResizeWindow={onResizeWindow}
            onToggleStar={toggleStarResolution}
            selectedItemId={selectedItemId}
            starredResolutions={starredResolutions}
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
