import { Resolution } from "../types";
import { CustomResolutionsList } from "./CustomResolutionsList";
import { DefaultResolutionsList } from "./DefaultResolutionsList";
import { ResolutionForm } from "./ResolutionForm";
import { useNavigation } from "@raycast/api";

interface ResolutionListContainerProps {
  isLoading: boolean;
  customResolutions: Resolution[];
  predefinedResolutions: Resolution[];
  onDeleteCustomResolution: (resolution: Resolution) => Promise<void>;
  onResizeWindow: (width: number, height: number) => Promise<void>;
  onRestorePreviousSize: () => Promise<void>;
  onGetCurrentWindowSize: () => Promise<void>;
  onCustomResolutionAdded: () => void;
  onMaximizeWindow: () => Promise<void>;
}

export function ResolutionListContainer({
  isLoading,
  customResolutions,
  predefinedResolutions,
  onDeleteCustomResolution,
  onResizeWindow,
  onRestorePreviousSize,
  onGetCurrentWindowSize,
  onCustomResolutionAdded,
  onMaximizeWindow,
}: ResolutionListContainerProps) {
  const { push } = useNavigation();

  const handleAddCustomResolution = async () => {
    push(
      <ResolutionForm
        onResizeWindow={onResizeWindow}
        predefinedResolutions={predefinedResolutions}
        onCustomResolutionAdded={onCustomResolutionAdded}
      />,
    );
  };

  // Loading or no custom resolutions, show default list
  if (isLoading || customResolutions.length === 0) {
    return (
      <DefaultResolutionsList
        predefinedResolutions={predefinedResolutions}
        onResizeWindow={onResizeWindow}
        onRestorePreviousSize={onRestorePreviousSize}
        onGetCurrentWindowSize={onGetCurrentWindowSize}
        onAddCustomResolution={handleAddCustomResolution}
        onMaximizeWindow={onMaximizeWindow}
      />
    );
  }

  // Have custom resolutions, show custom list
  return (
    <CustomResolutionsList
      customResolutions={customResolutions}
      predefinedResolutions={predefinedResolutions}
      onDeleteCustomResolution={onDeleteCustomResolution}
      onResizeWindow={onResizeWindow}
      onRestorePreviousSize={onRestorePreviousSize}
      onGetCurrentWindowSize={onGetCurrentWindowSize}
      onAddCustomResolution={handleAddCustomResolution}
      onMaximizeWindow={onMaximizeWindow}
    />
  );
}
