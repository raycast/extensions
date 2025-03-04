import { useMemo, useState } from "react";

import { usePackage } from "@/hooks/useJSRAPI";

export const useSelectedPackage = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedPackage = useMemo(() => {
    if (!selectedId) {
      return null;
    }

    const [scope, name] = selectedId.split("/");
    return { scope, name };
  }, [selectedId]);

  const {
    data: selectedPackageData,
    error: selectedPackageError,
    isLoading: selectedPageLoading,
  } = usePackage(selectedPackage);

  return {
    selectedPackage,
    selectedPackageData,
    selectedPackageError,
    selectedPageLoading,
    setSelectedId,
  };
};
