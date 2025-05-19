import { List, useNavigation } from "@raycast/api";
import { Resolution } from "../types";
import { ResolutionForm } from "./ResolutionForm";
import { OptionsList } from "./OptionsList";
import { CustomResolutionsList } from "./CustomResolutionsList";
import { DefaultResolutionsList } from "./DefaultResolutionsList";
import { StarredResolutionsList } from "./StarredResolutionsList";
import { useStarredResolutions } from "../hooks/useStarredResolutions";
import { useState, useEffect } from "react";

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
  const [showContent, setShowContent] = useState(false);

  // Ensure all data is ready before showing the list
  useEffect(() => {
    if (!externalIsLoading) {
      // Add a small delay to ensure all data is loaded
      const timer = setTimeout(() => {
        setShowContent(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [externalIsLoading]);

  // Set the selected item after the component is loaded
  useEffect(() => {
    if (showContent) {
      // Use setTimeout to ensure the list is rendered before setting the selected item
      const timer = setTimeout(() => {
        if (starredResolutions.length > 0) {
          const firstStarred = starredResolutions[0];
          setSelectedItemId(
            `${firstStarred.isCustom ? "custom" : "default"}-${firstStarred.width}x${firstStarred.height}-Starred Sizes-0`,
          );
        } else if (customResolutions.length > 0) {
          const firstCustom = customResolutions[0];
          setSelectedItemId(`custom-${firstCustom.width}x${firstCustom.height}-Custom Sizes-0`);
        } else if (predefinedResolutions.length > 0) {
          const firstDefault = predefinedResolutions[0];
          setSelectedItemId(`default-${firstDefault.width}x${firstDefault.height}-Default Sizes-0`);
        }
      }, 100); // Give the list some time to render

      return () => clearTimeout(timer);
    }
  }, [showContent, starredResolutions, customResolutions, predefinedResolutions]);

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
      isLoading={externalIsLoading || !showContent}
      searchBarPlaceholder="Search for sizes and commands..."
      navigationTitle="Window Sizer"
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => setSelectedItemId(id || undefined)}
    >
      {showContent && (
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
