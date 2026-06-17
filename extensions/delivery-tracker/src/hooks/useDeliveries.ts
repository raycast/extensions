import { environment } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { Delivery } from "../types/delivery";
import { debugDeliveries } from "../debugData";
import { useCallback, useMemo } from "react";

export function useDeliveries() {
  const {
    value: deliveries,
    setValue: setDeliveries,
    isLoading,
  } = useLocalStorage<Delivery[]>("deliveries", environment.isDevelopment ? debugDeliveries : []);

  const addDelivery = useCallback(
    async (delivery: Delivery) => {
      await setDeliveries([...(deliveries ?? []), delivery]);
    },
    [deliveries, setDeliveries],
  );

  const updateDelivery = useCallback(
    async (id: string, updates: Partial<Delivery>) => {
      if (!deliveries) return;
      const index = deliveries.findIndex((d) => d.id === id);
      if (index === -1) return;

      const updated = [...deliveries];
      updated[index] = { ...updated[index], ...updates };
      await setDeliveries(updated);
    },
    [deliveries, setDeliveries],
  );

  const removeDelivery = useCallback(
    async (id: string) => {
      if (!deliveries) return;
      await setDeliveries(deliveries.filter((d) => d.id !== id));
    },
    [deliveries, setDeliveries],
  );

  const activeDeliveries = useMemo(() => deliveries?.filter((d) => !d.archived) ?? [], [deliveries]);
  const archivedDeliveries = useMemo(() => deliveries?.filter((d) => d.archived) ?? [], [deliveries]);

  return {
    deliveries,
    activeDeliveries,
    archivedDeliveries,
    setDeliveries,
    addDelivery,
    updateDelivery,
    removeDelivery,
    isLoading,
  };
}
