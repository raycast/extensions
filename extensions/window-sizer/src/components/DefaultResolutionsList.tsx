import { Resolution } from "../types";
import { ResolutionList } from "./ResolutionList";

interface DefaultResolutionsListProps {
  predefinedResolutions: Resolution[];
  onResizeWindow: (width: number, height: number) => Promise<void>;
  onToggleStar: (resolution: Resolution) => Promise<void>;
  starredResolutions: Resolution[];
  selectedItemId?: string;
}

export function DefaultResolutionsList({
  predefinedResolutions,
  onResizeWindow,
  onToggleStar,
  starredResolutions,
  selectedItemId,
}: DefaultResolutionsListProps) {
  return (
    <ResolutionList
      resolutions={predefinedResolutions}
      onResizeWindow={onResizeWindow}
      sectionTitle="Default Sizes"
      onToggleStar={onToggleStar}
      starredResolutions={starredResolutions}
      selectedItemId={selectedItemId}
    />
  );
}
