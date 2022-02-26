import { useEffect, useState } from "react";
import { showToast, ToastStyle } from "@raycast/api";
import { AppleDeveloperDocumentationService } from "./services/apple-developer-documentation.service";
import { AppleDeveloperDocumentationEntry } from "./models/apple-developer-documentation/apple-developer-documentation-entry.model";
import { appleDeveloperDocumentationList } from "./user-interfaces/apple-developer-documentation/apple-developer-documentation-list.user-interface";

/**
 * Search Apple Developer documentation command
 */
export default () => {
  // Initialize AppleDeveloperDocumentationService
  const appleDeveloperDocumentationService = new AppleDeveloperDocumentationService();
  // Use search text State
  const [searchText, setSearchText] = useState<string | undefined>(undefined);
  // Use XcodeDeveloperDocumentationEntries State
  const [appleDeveloperDocumentationEntries, setAppleDeveloperDocumentationEntries] = useState<
    AppleDeveloperDocumentationEntry[] | undefined
  >(undefined);
  // Use Error State
  const [error, setError] = useState<string>();
  // Use isLoading State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // Initialize is cancelled bool value
  let isCancelled = false;
  // Use Effect
  useEffect(() => {
    async function search() {
      // Check if is cancelled
      if (isCancelled) {
        // Return out of function
        return;
      }
      // Check if search text is falsy
      if (!searchText) {
        // Disable is loading
        setIsLoading(false);
        // Clear Documentation Entries
        setAppleDeveloperDocumentationEntries(undefined);
        return;
      }
      // Enable is loading
      setIsLoading(true);
      // Clear error
      setError(undefined);
      try {
        // Search for Apple Developer Documentation Entries
        const entries = await appleDeveloperDocumentationService.search(searchText);
        // Check if is not cancelled
        if (!isCancelled) {
          // Set Documentation Entries
          setAppleDeveloperDocumentationEntries(entries);
        }
      } catch (error) {
        // Check if is not cancelled
        if (!isCancelled) {
          // Set error
          setError(String(error));
        }
      } finally {
        // Check if is not cancelled
        if (!isCancelled) {
          // Disable is loading
          setIsLoading(false);
        }
      }
    }
    // Clear current Documentation Entries
    setAppleDeveloperDocumentationEntries(undefined);
    // Search
    search();
    return () => {
      // Enable is cancelled
      isCancelled = true;
    };
  }, [searchText]);
  // Check if an error is available
  if (error) {
    // Show failure Toast
    showToast(ToastStyle.Failure, "An error occurred while searching", error);
  }
  // Return Apple Developer Documentation List
  return appleDeveloperDocumentationList(appleDeveloperDocumentationEntries, isLoading, setSearchText);
};
