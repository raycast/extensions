import { showToast, Toast } from "@raycast/api";
import { useFavWindowResize } from "./hooks/useFavWindowResize";
import { popToRoot } from "@raycast/api";
import { useEffect, useState, useRef } from "react";
import { FavResolutionEmptyView } from "./components/FavResolutionEmptyView";
import { useSavedFavResolution } from "./hooks/useSavedFavResolution";

export default function Command() {
  const { resizeWindow } = useFavWindowResize();
  const [isResizing, setIsResizing] = useState(false);
  const { savedResolution, isLoading, isValid } = useSavedFavResolution();
  const isExecuting = useRef(false);
  const hasResized = useRef(false);

  useEffect(() => {
    // Prevent multiple simultaneous executions or re-executions
    if (isExecuting.current || hasResized.current) {
      return;
    }

    async function applySavedResolution() {
      if (savedResolution) {
        isExecuting.current = true;
        try {
          setIsResizing(true);
          await resizeWindow(savedResolution.width, savedResolution.height);
          await popToRoot();
          hasResized.current = true;
        } catch (error) {
          console.error("Error applying saved resolution:", error);
          await showToast({
            style: Toast.Style.Failure,
            title: "Resize failed",
          });
        } finally {
          setIsResizing(false);
          isExecuting.current = false;
        }
      }
    }
    applySavedResolution();
  }, [savedResolution, resizeWindow]);

  if (isResizing) {
    return <FavResolutionEmptyView isResizing={true} />;
  }

  if (isLoading) {
    return <FavResolutionEmptyView />;
  }

  if (!isValid) {
    return <FavResolutionEmptyView isInvalidSize={true} />;
  }

  if (!savedResolution) {
    return <FavResolutionEmptyView />;
  }

  return <FavResolutionEmptyView isResizing={true} />;
}
