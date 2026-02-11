import { Resolution } from "../types";
import { ResolutionList } from "./ResolutionList";

interface DefaultResolutionsListProps {
  predefinedResolutions: Resolution[];
  onResizeWindow: (width: number, height: number) => Promise<void>;
  onToggleStar: (resolution: Resolution) => Promise<void>;
  selectedItemId?: string;
  starredResolutions: Resolution[];
}

export function DefaultResolutionsList({
  predefinedResolutions,
  onResizeWindow,
  onToggleStar,
  selectedItemId,
  starredResolutions,
}: DefaultResolutionsListProps) {
  return (
    <ResolutionList
      resolutions={predefinedResolutions}
      onResizeWindow={onResizeWindow}
      sectionTitle="Default Sizes"
      onToggleStar={onToggleStar}
      selectedItemId={selectedItemId}
      starredResolutions={starredResolutions}
    />
  );
}
