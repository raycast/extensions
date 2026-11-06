import { showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSavedDevices, getSelectedDevice, selectDevice } from "../lib/storage";
import { describeRokuError } from "../lib/roku";
import type { RokuDevice } from "../lib/types";

export function useDevices() {
  const [devices, setDevices] = useState<RokuDevice[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const generation = useRef(0);
  const selectionWrite = useRef<Promise<void>>(Promise.resolve());
  const mounted = useRef(false);

  const reload = useCallback(async () => {
    const current = ++generation.current;
    setIsLoading(true);
    try {
      // A refresh requested during a selection must read the resulting default.
      await selectionWrite.current.catch(() => undefined);
      if (current !== generation.current) return;
      const [saved, selected] = await Promise.all([getSavedDevices(), getSelectedDevice()]);
      if (current !== generation.current) return;
      setDevices(saved);
      setSelectedId(selected?.id);
      setError(undefined);
    } catch (cause) {
      if (current === generation.current) setError(describeRokuError(cause));
    } finally {
      if (current === generation.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void reload();
    return () => {
      mounted.current = false;
      generation.current += 1;
    };
  }, [reload]);

  const choose = useCallback(
    async (id: string) => {
      if (!id) return;
      const current = ++generation.current;
      // Stop rendering controls for the old target while the new choice saves.
      setSelectedId(undefined);
      setIsLoading(true);
      const write = selectionWrite.current.catch(() => undefined).then(() => selectDevice(id));
      selectionWrite.current = write;
      try {
        await write;
        if (current !== generation.current) return;
        setSelectedId(id);
        setError(undefined);
      } catch (cause) {
        if (!mounted.current || selectionWrite.current !== write) return;
        await reload();
        await showToast({ style: Toast.Style.Failure, title: "Couldn't select TV", message: describeRokuError(cause) });
      } finally {
        if (current === generation.current) setIsLoading(false);
      }
    },
    [reload],
  );

  return {
    devices,
    selectedId,
    device: devices.find((device) => device.id === selectedId),
    isLoading,
    error,
    reload,
    choose,
  };
}
