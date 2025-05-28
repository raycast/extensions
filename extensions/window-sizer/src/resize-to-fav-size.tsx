import { FavResolutionForm } from "./components/FavResolutionForm";
import { useFavWindowResize } from "./hooks/useFavWindowResize";
import { useSavedFavResolution } from "./hooks/useSavedFavResolution";
import { popToRoot } from "@raycast/api";
import { useEffect, useRef } from "react";

export default function Command() {
  const { resizeWindow } = useFavWindowResize();
  const { savedResolution, saveResolution } = useSavedFavResolution();
  const isFirstLoad = useRef(true);

  const handleSubmit = async (width: number, height: number) => {
    try {
      // On first entry, save and apply the size
      await saveResolution(width, height);
      await resizeWindow(width, height);
      await popToRoot();
    } catch (error) {
      console.error("Error in handleSubmit:", error);
    }
  };

  // On subsequent entries, directly apply the saved size
  useEffect(() => {
    async function applySavedResolution() {
      if (savedResolution && !isFirstLoad.current) {
        try {
          await resizeWindow(savedResolution.width, savedResolution.height);
          await popToRoot();
        } catch (error) {
          console.error("Error applying saved resolution:", error);
        }
      }
      isFirstLoad.current = false;
    }

    applySavedResolution();
  }, [savedResolution]);

  return <FavResolutionForm onSubmit={handleSubmit} savedResolution={savedResolution} />;
}
