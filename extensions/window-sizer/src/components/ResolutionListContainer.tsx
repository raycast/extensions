import { List, useNavigation } from "@raycast/api";
import { Resolution } from "../types";
import { ResolutionForm } from "./ResolutionForm";
import { OptionsList } from "./OptionsList";
import { CustomResolutionsList } from "./CustomResolutionsList";
import { PresetResolutionsList } from "./PresetResolutionsList";
import { StarredResolutionsList } from "./StarredResolutionsList";
import { useStarredResolutions } from "../hooks/useStarredResolutions";
import { useEffect, useState } from "react";
import { generateResolutionItemId } from "../utils/resolution";

interface ResolutionListContainerProps {
  isLoading: boolean;
  customResolutions: Resolution[];
  presetResolutions: Resolution[];
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
  presetResolutions,
  onDeleteCustomResolution,
  onResizeWindow,
  onRestorePreviousSize,
  onGetCurrentWindowSize,
  onCustomResolutionAdded,
  onMaximizeWindow,
}: ResolutionListContainerProps) {
  const { push } = useNavigation();
  const { starredResolutions, toggleStarResolution, isResolutionStarred, replaceStarredResolution } =
    useStarredResolutions();
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
        firstStarred.isCustom ? "custom" : "preset",
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
    } else if (presetResolutions.length > 0) {
      const firstPreset = presetResolutions[0];
      const itemId = generateResolutionItemId(firstPreset, "preset", "Preset Sizes", 0);
      setInitialSelectedItemId(itemId);
      setAccessorySelectedItemId(itemId);
    }
  }, [customResolutions, initialSelectedItemId, isContentReady, presetResolutions, starredResolutions]);

  const handleAddCustomResolution = async () => {
    push(
      <ResolutionForm
        onResizeWindow={onResizeWindow}
        presetResolutions={presetResolutions}
        onResolutionSaved={async () => {
          onCustomResolutionAdded();
        }}
      />,
    );
  };

  const handleEditCustomResolution = (resolution: Resolution) => {
    push(
      <ResolutionForm
        resolution={resolution}
        onResizeWindow={onResizeWindow}
        presetResolutions={presetResolutions}
        onResolutionSaved={async (nextResolution, prevResolution) => {
          onCustomResolutionAdded();

          if (!prevResolution) {
            return;
          }

          const wasStarred = await isResolutionStarred(prevResolution);
          if (!wasStarred) {
            return;
          }

          await replaceStarredResolution(prevResolution, nextResolution);
        }}
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
            selectedItemId={accessorySelectedItemId}
            starredResolutions={starredResolutions}
            onResizeWindow={onResizeWindow}
            onEditResolution={handleEditCustomResolution}
            onToggleStar={toggleStarResolution}
          />

          <CustomResolutionsList
            selectedItemId={accessorySelectedItemId}
            starredResolutions={starredResolutions}
            customResolutions={customResolutions}
            onResizeWindow={onResizeWindow}
            onDeleteResolution={onDeleteCustomResolution}
            onEditResolution={handleEditCustomResolution}
            onToggleStar={toggleStarResolution}
          />

          <PresetResolutionsList
            selectedItemId={accessorySelectedItemId}
            starredResolutions={starredResolutions}
            presetResolutions={presetResolutions}
            onResizeWindow={onResizeWindow}
            onToggleStar={toggleStarResolution}
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
