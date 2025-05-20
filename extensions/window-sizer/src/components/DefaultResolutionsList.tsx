import { List } from "@raycast/api";
import { Resolution } from "../types";
import { ResolutionList } from "./ResolutionList";
import { OptionsList } from "./OptionsList";
import { useStarredResolutions } from "../hooks/useStarredResolutions";

interface DefaultResolutionsListProps {
  predefinedResolutions: Resolution[];
  onResizeWindow: (width: number, height: number) => Promise<void>;
  onRestorePreviousSize: () => Promise<void>;
  onGetCurrentWindowSize: () => Promise<void>;
  onAddCustomResolution: () => Promise<void>;
  onMaximizeWindow: () => Promise<void>;
  isLoading?: boolean;
}

/**
 * DefaultResolutionsList component displays predefined resolutions and options
 */
export function DefaultResolutionsList({
  predefinedResolutions,
  onResizeWindow,
  onRestorePreviousSize,
  onGetCurrentWindowSize,
  onAddCustomResolution,
  onMaximizeWindow,
  isLoading = false,
}: DefaultResolutionsListProps) {
  const { starredResolutions, toggleStarResolution } = useStarredResolutions();

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
