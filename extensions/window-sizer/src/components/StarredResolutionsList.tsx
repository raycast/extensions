import { Resolution } from "../types";
import { ResolutionList } from "./ResolutionList";

interface StarredResolutionsListProps {
  starredResolutions: Resolution[];
  onResizeWindow: (width: number, height: number) => Promise<void>;
  onDeleteResolution: (resolution: Resolution) => Promise<void>;
  onEditResolution: (resolution: Resolution) => void;
  onToggleStar: (resolution: Resolution) => Promise<void>;
  searchText: string;
  selectedItemId?: string;
}

export function StarredResolutionsList({
  starredResolutions,
  onResizeWindow,
  onDeleteResolution,
  onEditResolution,
  onToggleStar,
  searchText,
  selectedItemId,
}: StarredResolutionsListProps) {
  if (starredResolutions.length === 0) {
    return null;
  }

  return (
    <ResolutionList
      resolutions={starredResolutions}
      onResizeWindow={onResizeWindow}
      sectionTitle="Starred Sizes"
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
