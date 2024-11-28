import { useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { Bundle } from "../types";
import { loadBundles, saveBundles } from "../utils/storage";

export function useBundles() {
  const [bundles, setBundles] = useState<Bundle[]>(loadBundles());

  const isDuplicateTitle = (title: string, excludeIndex?: number): boolean => {
    return bundles.some(
      (bundle, index) => bundle.title.toLowerCase() === title.toLowerCase() && index !== excludeIndex,
    );
  };

  const createBundle = (newBundle: Bundle) => {
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
    saveBundles(updatedBundles);
    showToast({
      style: Toast.Style.Success,
      title: "Success",
      message: "Bundle added successfully",
    });
    return true;
  };

  const editBundle = (index: number, updatedBundle: Bundle) => {
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
    saveBundles(updatedBundles);
    showToast({
      style: Toast.Style.Success,
      title: "Success",
      message: "Bundle updated successfully",
    });
    return true;
  };

  const deleteBundle = (index: number) => {
    const updatedBundles = bundles.filter((_, i) => i !== index);
    setBundles(updatedBundles);
    saveBundles(updatedBundles);
    showToast({
      style: Toast.Style.Success,
      title: "Success",
      message: "Bundle deleted successfully",
    });
    return true;
  };

  return {
    bundles,
    createBundle,
    editBundle,
    deleteBundle,
  };
}
