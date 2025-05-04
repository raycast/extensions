import { PREDEFINED_RESOLUTIONS } from "./constants/resolutions";
import { ResolutionListContainer } from "./components";
import {
  useWindowResize,
  useCurrentWindowSize,
  useWindowRestore,
  useCustomResolutions,
  useMaximizeWindow,
  useWindowInfo,
} from "./hooks";

export default function ResizeWindow() {
  const { resizeWindow } = useWindowResize();
  const { getCurrentWindowSize } = useCurrentWindowSize();
  const { restorePreviousSize } = useWindowRestore();
  const { isLoading, customResolutions, deleteCustomResolution, refreshCustomResolutions } = useCustomResolutions();
  const { maximizeWindow } = useMaximizeWindow();

  // Use the enhanced windowInfo hook that includes caching
  // This automatically initializes when component mounts
  useWindowInfo();

  // ResolutionListContainer
  return (
    <ResolutionListContainer
      isLoading={isLoading}
      customResolutions={customResolutions}
      predefinedResolutions={PREDEFINED_RESOLUTIONS}
      onDeleteCustomResolution={deleteCustomResolution}
      onResizeWindow={resizeWindow}
      onRestorePreviousSize={restorePreviousSize}
      onGetCurrentWindowSize={getCurrentWindowSize}
      onCustomResolutionAdded={refreshCustomResolutions}
      onMaximizeWindow={maximizeWindow}
    />
  );
}
