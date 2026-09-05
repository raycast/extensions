import { useCallback, useEffect, useState } from "react";

import type { Destination } from "../domain/destination";
import { getDestinations } from "../services/destination-repository";

export interface DestinationState {
  destinations: Destination[];
  error?: Error;
  isLoading: boolean;
  reload: () => Promise<void>;
  setDestinations: (destinations: Destination[]) => void;
}

export function useDestinations(): DestinationState {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [error, setError] = useState<Error>();
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      setDestinations(await getDestinations());
      setError(undefined);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError : new Error(String(loadError)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { destinations, error, isLoading, reload, setDestinations };
}
