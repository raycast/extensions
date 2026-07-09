import { Resolution } from "../types";
import { ResolutionList } from "./ResolutionList";

interface StarredResolutionsListProps {
  selectedItemId?: string;
  starredResolutions: Resolution[];
  onResizeWindow: (width: number, height: number) => Promise<void>;
  onEditResolution: (resolution: Resolution) => void;
  onToggleStar: (resolution: Resolution) => Promise<void>;
}

export function StarredResolutionsList({
  selectedItemId,
  starredResolutions,
  onResizeWindow,
  onEditResolution,
  onToggleStar,
}: StarredResolutionsListProps) {
  if (starredResolutions.length === 0) {
    return null;
  }

  return (
    <ResolutionList
      sectionTitle="Starred Sizes"
      selectedItemId={selectedItemId}
      resolutions={starredResolutions}
      starredResolutions={starredResolutions}
      onResizeWindow={onResizeWindow}
      onEditResolution={onEditResolution}
      onToggleStar={onToggleStar}
    />
  );
}
