import { List } from "@raycast/api";
import { Resolution } from "../types";
import { ResolutionList } from "./ResolutionList";
import { OptionsList } from "./OptionsList";

interface DefaultResolutionsListProps {
  predefinedResolutions: Resolution[];
  onResizeWindow: (width: number, height: number) => Promise<void>;
  onRestorePreviousSize: () => Promise<void>;
  onGetCurrentWindowSize: () => Promise<void>;
  onAddCustomResolution: () => void;
  onMaximizeWindow: () => Promise<void>;
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
}: DefaultResolutionsListProps) {
  return (
    <List searchBarPlaceholder="Search for sizes and commands..." navigationTitle="Window Sizer">
      <ResolutionList
        resolutions={predefinedResolutions}
        onResizeWindow={onResizeWindow}
        sectionTitle="Default Sizes"
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
