import { listDestinationAddresses } from "../utils";

import { useState, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";

export function useListDestinationAddresses() {
  const [destinationAddresses, setDestinationAddresses] = useState<Array<string>>([]);
  const [isLoadingListDestinationAddresses, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await listDestinationAddresses();

        setDestinationAddresses(res);
        setIsLoading(false);
      } catch (error) {
        showToast(Toast.Style.Failure, "Get list of routing rules fail");
      }
    })();
  }, []);

  return { destinationAddresses, isLoadingListDestinationAddresses };
}
