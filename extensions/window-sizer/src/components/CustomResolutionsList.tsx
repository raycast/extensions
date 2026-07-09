import { Resolution } from "../types";
import { ResolutionList } from "./ResolutionList";

interface CustomResolutionsListProps {
  selectedItemId?: string;
  starredResolutions: Resolution[];
  customResolutions: Resolution[];
  onResizeWindow: (width: number, height: number) => Promise<void>;
  onDeleteResolution: (resolution: Resolution) => Promise<void>;
  onEditResolution: (resolution: Resolution) => void;
  onToggleStar: (resolution: Resolution) => Promise<void>;
}

export function CustomResolutionsList({
  selectedItemId,
  starredResolutions,
  customResolutions,
  onResizeWindow,
  onDeleteResolution,
  onEditResolution,
  onToggleStar,
}: CustomResolutionsListProps) {
  if (customResolutions.length === 0) {
    return null;
  }

  return (
    <ResolutionList
      showDeleteAction
      sectionTitle="Custom Sizes"
      selectedItemId={selectedItemId}
      resolutions={customResolutions}
      starredResolutions={starredResolutions}
      onResizeWindow={onResizeWindow}
      onDeleteResolution={onDeleteResolution}
      onEditResolution={onEditResolution}
      onToggleStar={onToggleStar}
    />
  );
}
