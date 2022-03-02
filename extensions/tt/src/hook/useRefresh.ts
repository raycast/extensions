import { useState } from "react";

export const useRefresh = () => {
  const [refreshCount, setRefreshCount] = useState(0);
  const refresh = () => setRefreshCount((prev) => prev + 1);

  return {
    refresh,
    refreshCount,
  };
};
