import { getPreferenceValues } from "@raycast/api";
import { useState } from "react";

export function useAutoSaveConversation(): boolean {
  const [isAutoSaveConversation] = useState(() => {
    return getPreferenceValues<{
      isAutoSaveConversation: boolean;
    }>().isAutoSaveConversation;
  });

  return isAutoSaveConversation;
}
