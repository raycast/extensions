import { showFailureToast, usePromise } from "@raycast/utils";
import { useCallback, useRef } from "react";
import { getSavedDevices, getSelectedDevice, selectDevice } from "../lib/storage";
import { describeRokuError } from "../lib/roku";

export function useDevices() {
  // Selection writes are chained so they land in order, and a refresh started
  // during a selection reads the resulting default.
  const selectionWrite = useRef<Promise<void>>(Promise.resolve());
  const { data, isLoading, error, revalidate, mutate } = usePromise(
    async () => {
      await selectionWrite.current.catch(() => undefined);
      const [devices, selected] = await Promise.all([getSavedDevices(), getSelectedDevice()]);
      return { devices, selectedId: selected?.id };
    },
    [],
    { onError: () => undefined },
  );

  const reload = useCallback(async () => {
    await revalidate();
  }, [revalidate]);

  const choose = useCallback(
    async (id: string) => {
      if (!id) return;
      const write = selectionWrite.current.catch(() => undefined).then(() => selectDevice(id));
      selectionWrite.current = write;
      try {
        // Show the new target right away; mutate rolls back if the write fails.
        await mutate(write, {
          optimisticUpdate: (current) => ({ devices: current?.devices ?? [], selectedId: id }),
          shouldRevalidateAfter: false,
        });
      } catch (cause) {
        if (selectionWrite.current !== write) return;
        await showFailureToast(describeRokuError(cause), { title: "Couldn't select TV" });
      }
    },
    [mutate],
  );

  const devices = data?.devices ?? [];
  const selectedId = data?.selectedId;
  return {
    devices,
    selectedId,
    device: devices.find((device) => device.id === selectedId),
    isLoading,
    error: error ? describeRokuError(error) : undefined,
    reload,
    choose,
  };
}
