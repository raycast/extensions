import { Resolution } from "../types";
import { ResolutionList } from "./ResolutionList";

interface StarredResolutionsListProps {
  starredResolutions: Resolution[];
  onResizeWindow: (width: number, height: number) => Promise<void>;
  onToggleStar: (resolution: Resolution) => Promise<void>;
  selectedItemId?: string;
}

export function StarredResolutionsList({
  starredResolutions,
  onResizeWindow,
  onToggleStar,
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
      onToggleStar={onToggleStar}
      selectedItemId={selectedItemId}
      starredResolutions={starredResolutions}
    />
  );
}
