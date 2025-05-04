import { List } from "@raycast/api";
import { Resolution } from "../types";
import { ResolutionList } from "./ResolutionList";
import { OptionsList } from "./OptionsList";

interface CustomResolutionsListProps {
  customResolutions: Resolution[];
  predefinedResolutions: Resolution[];
  onDeleteCustomResolution: (resolution: Resolution) => Promise<void>;
  onResizeWindow: (width: number, height: number) => Promise<void>;
  onRestorePreviousSize: () => Promise<void>;
  onGetCurrentWindowSize: () => Promise<void>;
  onAddCustomResolution: () => void;
  onMaximizeWindow: () => Promise<void>;
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
}: CustomResolutionsListProps) {
  return (
    <List searchBarPlaceholder="Search for sizes and commands..." navigationTitle="Window Sizer">
      <ResolutionList
        resolutions={customResolutions}
        onResizeWindow={onResizeWindow}
        sectionTitle="Custom Sizes"
        showDeleteAction
        onDeleteResolution={onDeleteCustomResolution}
      />

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
