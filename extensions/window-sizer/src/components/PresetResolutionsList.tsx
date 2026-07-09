import { Resolution } from "../types";
import { ResolutionList } from "./ResolutionList";

interface PresetResolutionsListProps {
  selectedItemId?: string;
  starredResolutions: Resolution[];
  presetResolutions: Resolution[];
  onResizeWindow: (width: number, height: number) => Promise<void>;
  onToggleStar: (resolution: Resolution) => Promise<void>;
}

export function PresetResolutionsList({
  selectedItemId,
  starredResolutions,
  presetResolutions,
  onResizeWindow,
  onToggleStar,
}: PresetResolutionsListProps) {
  return (
    <ResolutionList
      sectionTitle="Preset Sizes"
      selectedItemId={selectedItemId}
      starredResolutions={starredResolutions}
      resolutions={presetResolutions}
      onResizeWindow={onResizeWindow}
      onToggleStar={onToggleStar}
    />
  );
}
