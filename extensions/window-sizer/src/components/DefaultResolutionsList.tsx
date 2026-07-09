import { Resolution } from "../types";
import { ResolutionList } from "./ResolutionList";

interface DefaultResolutionsListProps {
  selectedItemId?: string;
  starredResolutions: Resolution[];
  predefinedResolutions: Resolution[];
  onResizeWindow: (width: number, height: number) => Promise<void>;
  onToggleStar: (resolution: Resolution) => Promise<void>;
}

export function DefaultResolutionsList({
  selectedItemId,
  starredResolutions,
  predefinedResolutions,
  onResizeWindow,
  onToggleStar,
}: DefaultResolutionsListProps) {
  return (
    <ResolutionList
      sectionTitle="Default Sizes"
      selectedItemId={selectedItemId}
      starredResolutions={starredResolutions}
      resolutions={predefinedResolutions}
      onResizeWindow={onResizeWindow}
      onToggleStar={onToggleStar}
    />
  );
}
