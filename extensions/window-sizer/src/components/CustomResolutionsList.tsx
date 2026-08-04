import { Resolution } from "../types";
import { ResolutionList } from "./ResolutionList";

interface CustomResolutionsListProps {
  customResolutions: Resolution[];
  onResizeWindow: (width: number, height: number) => Promise<void>;
  onDeleteResolution: (resolution: Resolution) => Promise<void>;
  onEditResolution: (resolution: Resolution) => void;
  onToggleStar: (resolution: Resolution) => Promise<void>;
  starredResolutions: Resolution[];
  searchText: string;
  selectedItemId?: string;
}

export function CustomResolutionsList({
  customResolutions,
  onResizeWindow,
  onDeleteResolution,
  onEditResolution,
  onToggleStar,
  starredResolutions,
  searchText,
  selectedItemId,
}: CustomResolutionsListProps) {
  if (customResolutions.length === 0) {
    return null;
  }

  return (
    <ResolutionList
      resolutions={customResolutions}
      onResizeWindow={onResizeWindow}
      sectionTitle="Custom Sizes"
      showDeleteAction
      onDeleteResolution={onDeleteResolution}
      onEditResolution={onEditResolution}
      onToggleStar={onToggleStar}
      starredResolutions={starredResolutions}
      searchText={searchText}
      selectedItemId={selectedItemId}
    />
  );
}
