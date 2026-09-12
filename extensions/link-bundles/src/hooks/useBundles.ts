import { useCallback, useEffect, useState } from "react";
import { Alert, confirmAlert, showToast, Toast } from "@raycast/api";
import { Bundle } from "../types";
import { loadBundles, saveBundles } from "../utils/storage";

export function useBundles() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeBundles = async () => {
      const loadedBundles = await loadBundles();
      setBundles(loadedBundles);
      setIsLoading(false);
    };
    initializeBundles();
  }, []);

  const isDuplicateTitle = useCallback(
    (title: string, excludeIndex?: number): boolean => {
      return bundles.some(
        (bundle, index) => bundle.title.toLowerCase() === title.toLowerCase() && index !== excludeIndex,
      );
    },
    [bundles],
  );

  const createBundle = async (newBundle: Bundle) => {
    if (isDuplicateTitle(newBundle.title)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Duplicate Bundle",
        message: "A bundle with this title already exists",
      });
      return false;
    }

    const updatedBundles = [...bundles, newBundle];
    setBundles(updatedBundles);
    await saveBundles(updatedBundles);
    showToast({
      style: Toast.Style.Success,
      title: "Success",
      message: "Bundle added successfully",
    });
    return true;
  };

  const editBundle = async (index: number, updatedBundle: Bundle) => {
    if (isDuplicateTitle(updatedBundle.title, index)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Duplicate Bundle",
        message: "A bundle with this title already exists",
      });
      return false;
    }

    const updatedBundles = [...bundles];
    updatedBundles[index] = updatedBundle;
    setBundles(updatedBundles);
    await saveBundles(updatedBundles);
    showToast({
      style: Toast.Style.Success,
      title: "Success",
      message: "Bundle updated successfully",
    });
    return true;
  };

  const deleteBundle = async (index: number) => {
    await confirmAlert({
      title: "Are you sure?",
      message: "This will remove the bundle.",
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
        onAction: async () => {
          const updatedBundles = bundles.filter((_, i) => i !== index);
          setBundles(updatedBundles);
          await saveBundles(updatedBundles);
          showToast({
            style: Toast.Style.Success,
            title: "Success",
            message: "Bundle deleted successfully",
          });
        },
      },
      dismissAction: {
        title: "Cancel",
      },
    });
    return true;
  };

  return {
    bundles,
    isLoading,
    createBundle,
    editBundle,
    deleteBundle,
  };
}
