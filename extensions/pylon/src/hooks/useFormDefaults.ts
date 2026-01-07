import { useState, useEffect } from "react";
import { getPreferences } from "../api";
import { getLastUsed } from "../utils";

interface FormDefaults {
  accountId: string;
  assigneeId: string;
  projectId: string;
  isLoaded: boolean;
}

/**
 * Hook to manage form default values from preferences and last used storage.
 * Handles the priority: preferences > lastUsed > fallbacks
 */
export function useFormDefaults(currentUserId?: string): FormDefaults {
  const [defaults, setDefaults] = useState<FormDefaults>({
    accountId: "",
    assigneeId: "",
    projectId: "",
    isLoaded: false,
  });

  useEffect(() => {
    async function loadDefaults() {
      const prefs = getPreferences();
      const lastUsed = await getLastUsed();

      // Determine account ID: preference > lastUsed
      const accountId = prefs.defaultAccountId || lastUsed.accountId || "";

      // Determine project ID: preference > lastUsed
      const projectId = prefs.defaultProjectId || lastUsed.projectId || "";

      // Determine assignee ID: "me" keyword > preference > currentUser
      let assigneeId = "";
      if (prefs.defaultAssignee === "me" && currentUserId) {
        assigneeId = currentUserId;
      } else if (prefs.defaultAssignee && prefs.defaultAssignee !== "me") {
        assigneeId = prefs.defaultAssignee;
      } else if (currentUserId) {
        assigneeId = currentUserId;
      }

      setDefaults({
        accountId,
        assigneeId,
        projectId,
        isLoaded: true,
      });
    }

    loadDefaults();
  }, [currentUserId]);

  return defaults;
}
