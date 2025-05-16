import { List } from "@raycast/api";
import { Resolution } from "../types";
import { ResolutionList } from "./ResolutionList";
import { OptionsList } from "./OptionsList";
import { useStarredResolutions } from "../hooks/useStarredResolutions";

interface CustomResolutionsListProps {
  customResolutions: Resolution[];
  predefinedResolutions: Resolution[];
  onDeleteCustomResolution: (resolution: Resolution) => Promise<void>;
  onResizeWindow: (width: number, height: number) => Promise<void>;
  onRestorePreviousSize: () => Promise<void>;
  onGetCurrentWindowSize: () => Promise<void>;
  onAddCustomResolution: () => Promise<void>;
  onMaximizeWindow: () => Promise<void>;
  isLoading?: boolean;
}

/**
 * CustomResolutionsList component displays both custom and predefined resolutions
 */
export function CustomResolutionsList({
  customResolutions,
  predefinedResolutions,
  onDeleteCustomResolution,
  onResizeWindow,
  onRestorePreviousSize,
  onGetCurrentWindowSize,
  onAddCustomResolution,
  onMaximizeWindow,
  isLoading = false,
}: CustomResolutionsListProps) {
  const { starredResolutions, toggleStarResolution } = useStarredResolutions();

  // Combine all resolutions for star status
  const allResolutions = [...customResolutions, ...predefinedResolutions].map((resolution) => ({
    ...resolution,
    isStarred: starredResolutions.some((r) => r.title === resolution.title),
  }));

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search for sizes and commands..." navigationTitle="Window Sizer">
      {starredResolutions.length > 0 && (
        <ResolutionList
          resolutions={starredResolutions}
          onResizeWindow={onResizeWindow}
          sectionTitle="Starred Sizes"
          onToggleStar={toggleStarResolution}
        />
      )}

      <ResolutionList
        resolutions={customResolutions}
        onResizeWindow={onResizeWindow}
        sectionTitle="Custom Sizes"
        showDeleteAction
        onDeleteResolution={onDeleteCustomResolution}
        onToggleStar={toggleStarResolution}
      />

      <ResolutionList
        resolutions={predefinedResolutions}
        onResizeWindow={onResizeWindow}
        sectionTitle="Default Sizes"
        onToggleStar={toggleStarResolution}
      />

      <OptionsList
        onRestorePreviousSize={onRestorePreviousSize}
        onGetCurrentWindowSize={onGetCurrentWindowSize}
        onAddCustomResolution={onAddCustomResolution}
        onMaximizeWindow={onMaximizeWindow}
      />
    </List>
  );
}
