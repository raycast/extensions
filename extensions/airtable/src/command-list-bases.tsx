import { Detail, Toast, showToast } from "@raycast/api";
import { useState, useEffect } from "react";

import * as airtable from "./oauth-client";
import { BaseList } from "./BaseList";
import { AirtableBaseMetadata } from "./types";
import * as api from "./metadata-api";
import { getNumberOfClicksByBaseIdAsync, NumberOfClicksByBase } from "./LocalStorageWrapper";

export default function Command() {
  const service = airtable as unknown as Service;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [bases, setBases] = useState<AirtableBaseMetadata[]>(api.getCachedBaseList);
  const [numberOfClicksByBaseId, setNumberOfClicksByBaseId] = useState<NumberOfClicksByBase>({});
  const [isLoadingClicksByBase, setIsLoadingClicksByBase] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      const clicksByBase = await getNumberOfClicksByBaseIdAsync();
      setNumberOfClicksByBaseId(clicksByBase);
      setIsLoadingClicksByBase(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await service.authorize();
        const fetchedBaseList = await api.fetchBaseList();
        setBases(fetchedBaseList);
        setIsLoading(false);
      } catch (error) {
        console.error(error);
        setIsLoading(false);
        showToast({ style: Toast.Style.Failure, title: String(error) });
      }
    })();
  }, [service]);

  if ((isLoading && bases.length === 0) || isLoadingClicksByBase) {
    return <Detail isLoading={isLoading} />;
  }

  return <BaseList isLoading={isLoading} bases={bases} numberOfClicksByBaseId={numberOfClicksByBaseId} />;
}

// Services
interface Service {
  authorize(): Promise<void>;
}
