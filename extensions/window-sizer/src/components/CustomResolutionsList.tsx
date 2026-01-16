import { Resolution } from "../types";
import { ResolutionList } from "./ResolutionList";

interface CustomResolutionsListProps {
  customResolutions: Resolution[];
  onResizeWindow: (width: number, height: number) => Promise<void>;
  onDeleteResolution: (resolution: Resolution) => Promise<void>;
  onToggleStar: (resolution: Resolution) => Promise<void>;
  selectedItemId?: string | null | undefined;
  starredResolutions: Resolution[];
}

export function CustomResolutionsList({
  customResolutions,
  onResizeWindow,
  onDeleteResolution,
  onToggleStar,
  selectedItemId,
  starredResolutions,
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
      onToggleStar={onToggleStar}
      selectedItemId={selectedItemId}
      starredResolutions={starredResolutions}
    />
  );
}
