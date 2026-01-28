import { getPreferenceValues } from "@raycast/api";
import { useState } from "react";

export const useAutoSaveConversation = () => {
  const [isAutoSaveConversation] = useState(() => {
    return getPreferenceValues<{ isAutoSaveConversation: boolean }>().isAutoSaveConversation;
  });
  return isAutoSaveConversation;
};
