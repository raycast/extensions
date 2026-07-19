import { Resolution } from "../types";
import { ResolutionList } from "./ResolutionList";

interface DefaultResolutionsListProps {
  predefinedResolutions: Resolution[];
  onResizeWindow: (width: number, height: number) => Promise<void>;
  onToggleStar: (resolution: Resolution) => Promise<void>;
  starredResolutions: Resolution[];
  searchText: string;
  selectedItemId?: string;
}

export function DefaultResolutionsList({
  predefinedResolutions,
  onResizeWindow,
  onToggleStar,
  starredResolutions,
  searchText,
  selectedItemId,
}: DefaultResolutionsListProps) {
  return (
    <ResolutionList
      resolutions={predefinedResolutions}
      onResizeWindow={onResizeWindow}
      sectionTitle="Preset Sizes"
      onToggleStar={onToggleStar}
      starredResolutions={starredResolutions}
      searchText={searchText}
      selectedItemId={selectedItemId}
    />
  );
}
