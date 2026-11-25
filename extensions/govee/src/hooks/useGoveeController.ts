import type { Device } from "@j3lte/govee-lan-controller";
import { Govee, GoveeEventTypes } from "@j3lte/govee-lan-controller";
import { createSocket } from "node:dgram";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import type { GoveeControllerReturn, Scenario } from "@/types";

import { CloudDevice, fetchCloudDevices, normalizeId } from "@/lib/cloud";

import { execScenario, wait } from "@/utils";

const { deviceDiscoveryTimeout, goveeApiKey } = getPreferenceValues<Preferences>();
const API_KEY = goveeApiKey?.trim() || "";
const DISCOVERY_TIMEOUT_VALUE = deviceDiscoveryTimeout ? parseInt(deviceDiscoveryTimeout) : 5000;
const DISCOVERY_TIMEOUT = Number.isNaN(DISCOVERY_TIMEOUT_VALUE)
  ? 5000
  : DISCOVERY_TIMEOUT_VALUE < 1000
    ? 1000
    : DISCOVERY_TIMEOUT_VALUE;

// One LAN controller per extension process, never destroyed by a component. Raycast's dev mode
// runs effects twice, and every controller binds its own listener on port 4002 where only one
// of them receives the lights' replies, so a second controller leaves the visible one deaf.
let shared: Govee | null = null;
const getController = () => (shared ??= new Govee({ discoverInterval: 10000, deviceUpdateInterval: 2000 }));

const useGoveeController = (): GoveeControllerReturn => {
  const govee = useRef<Govee | null>(null);

  const [lanDevices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Plain device info, cached by Raycast between launches so the list shows at once.
  const {
    data: cloudInfos,
    isLoading: cloudLoading,
    error: cloudError,
    revalidate: retryCloud,
  } = useCachedPromise(fetchCloudDevices, [API_KEY], { execute: !!API_KEY, keepPreviousData: true });

  // One CloudDevice per light, kept while its info is unchanged (rows and listeners hold on to it)
  // and rebuilt when Govee reports a new name, snapshot or capability.
  const cloudInstances = useRef(new Map<string, { info: string; device: CloudDevice }>());
  const cloudDevices = useMemo(
    () =>
      (API_KEY ? (cloudInfos ?? []) : []).map((info) => {
        const key = JSON.stringify(info);
        const existing = cloudInstances.current.get(info.device);
        if (existing?.info === key) return existing.device;
        const device = new CloudDevice(API_KEY, info);
        cloudInstances.current.set(info.device, { info: key, device });
        return device;
      }),
    [cloudInfos],
  );

  // A light shows up at once via the cloud and switches to LAN as soon as LAN finds it.
  const devices = useMemo(() => {
    const cloudById = new Map(cloudDevices.map((c) => [normalizeId(c.id), c]));
    // LAN only reports the model; the name set in the Govee app comes from the cloud.
    for (const d of lanDevices) {
      const cloud = cloudById.get(normalizeId(d.id));
      if (cloud) {
        (d as { name: string }).name = cloud.name;
        // Cloud twin for cloud-only features (snapshots); everything else stays on LAN.
        (d as Device & { cloud?: CloudDevice }).cloud = cloud;
      }
    }
    const lanIds = new Set(lanDevices.map((d) => normalizeId(d.id)));
    const cloudOnly = cloudDevices.filter((c) => !lanIds.has(normalizeId(c.id)));
    return [...lanDevices, ...(cloudOnly as unknown as Device[])].sort((a, b) => a.name.localeCompare(b.name));
  }, [lanDevices, cloudDevices]);

  const updateDevices = useCallback(
    ({ device, op }: { device: Device; op: "add" | "remove" }) => {
      setDevices((prev) => {
        if (op === "add") {
          return prev.some((d) => d.id === device.id) ? prev : [...prev, device];
        }
        return prev.filter((d) => d.id !== device.id);
      });
    },
    [devices, setDevices],
  );

  const executeScenario = useCallback(
    async ({ scenario }: { scenario: Scenario }) => {
      const controller = govee.current;
      if (!controller) {
        throw new Error("Govee controller not ready");
      }

      return execScenario(scenario, controller, devices);
    },
    [devices],
  );

  useEffect(() => {
    const controller = getController();
    // Lights found by an earlier mount of this command; merge so a light already listed is never dropped.
    setDevices((prev) => [...prev, ...controller.devices.filter((d) => !prev.some((p) => p.id === d.id))]);

    // The library sends one scan before it's ready; if that UDP packet is lost it never scans
    // again. Lights answer scans on port 4002 whoever sent them, so keep scanning until one shows up.
    const kick = createSocket({ type: "udp4" });
    kick.on("error", () => undefined);
    const scan = JSON.stringify({ msg: { cmd: "scan", data: { account_topic: "reserve" } } });
    const kickTimer = setInterval(() => kick.send(scan, 4001, "239.255.255.250"), 500);
    let kicking = true;
    const stopKick = () => {
      if (!kicking) return;
      kicking = false;
      clearInterval(kickTimer);
      kick.close();
    };
    const kickLimit = setTimeout(stopKick, 15_000);
    if (controller.devices.length > 0) stopKick();

    const onNewDevice = (device: Device) => {
      stopKick();
      updateDevices({ device, op: "add" });
    };
    const onError = (err: unknown) => setError(err instanceof Error ? err : new Error("Unknown error"));
    const onUnknownMessage = (msg: unknown) => console.warn("Unknown message", msg);
    controller.on(GoveeEventTypes.NewDevice, onNewDevice);
    controller.on(GoveeEventTypes.Error, onError);
    controller.on(GoveeEventTypes.UnknownMessage, onUnknownMessage);

    let active = true;
    const abortController = new AbortController();
    Promise.race([
      controller.waitForReady().then(() => abortController.abort()), // Abort the timeout if controller is ready
      wait(DISCOVERY_TIMEOUT, abortController.signal),
    ])
      .catch((error: unknown) => {
        if (active && error instanceof Error && error.message !== "Aborted") {
          setError(new Error("Error initializing Govee Controller: timeout"));
        }
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
        govee.current = controller;
      });

    return () => {
      active = false;
      stopKick();
      clearTimeout(kickLimit);
      controller.off(GoveeEventTypes.NewDevice, onNewDevice);
      controller.off(GoveeEventTypes.Error, onError);
      controller.off(GoveeEventTypes.UnknownMessage, onUnknownMessage);
    };
  }, []);

  return {
    devices,
    executeScenario,
    isLoading,
    cloudLoading: !!API_KEY && cloudLoading,
    error: error ?? cloudError ?? null,
    retryCloud: API_KEY ? retryCloud : undefined,
    controller: govee.current,
  };
};

export default useGoveeController;
