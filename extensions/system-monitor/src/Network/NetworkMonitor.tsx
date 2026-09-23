import { useEffect, useRef } from "react";
import { Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useInterval } from "usehooks-ts";

import { Actions } from "../components/Actions";
import { bytesPerSecond } from "../lib/rate";
import { formatBytes, isObjectEmpty } from "../utils";
import { getNetworkData, getTopProcess } from "./NetworkUtils";

// Floor the sampling window so clock jitter between two nearly simultaneous
// samples cannot inflate the derived rate.
const MIN_ELAPSED_MS = 100;

export default function NetworkMonitor({ isActive = false }: { isActive?: boolean }) {
  const prevProcess = useRef<{ [key: string]: number[] }>({});
  const prevSampleTime = useRef<number | null>(null);
  const isActiveRef = useRef(isActive);

  useEffect(() => {
    isActiveRef.current = isActive;
    if (!isActive) {
      prevProcess.current = {};
      prevSampleTime.current = null;
    }
  }, [isActive]);

  const { data, isLoading, revalidate } = usePromise(
    async () => {
      const currProcess = await getNetworkData();

      // nettop blocks for seconds; if the tab was deselected while it ran,
      // discard the sample so stale counters never survive a deactivation reset.
      if (!isActiveRef.current) {
        return undefined;
      }
      // nettop blocks for one sample interval (multiple seconds on recent
      // macOS), so rates are derived from the measured time between samples.
      const now = Date.now();
      const elapsedMs = prevSampleTime.current ? Math.max(now - prevSampleTime.current, MIN_ELAPSED_MS) : 0;
      let upload = 0;
      let download = 0;
      let processList: [string, number, number][] = [];

      if (!isObjectEmpty(prevProcess.current)) {
        for (const key in currProcess) {
          const prev = prevProcess.current[key];

          // nettop counters are cumulative over a process's lifetime, so a
          // process first seen in this sample has no baseline to subtract.
          // Counting it would report its entire history as one interval's
          // traffic, spiking the aggregate rate.
          if (prev === undefined) {
            continue;
          }

          const down = bytesPerSecond(currProcess[key][0] - prev[0], elapsedMs);
          const up = bytesPerSecond(currProcess[key][1] - prev[1], elapsedMs);

          download += down;
          upload += up;
          // Keys carry nettop's ".pid" suffix for identity; strip it for display.
          processList.push([key.replace(/\.\d+$/, ""), down, up]);
        }

        processList = getTopProcess(processList);
      }

      prevProcess.current = currProcess;
      prevSampleTime.current = now;

      return {
        upload,
        download,
        processList,
      };
    },
    [],
    { execute: isActive },
  );

  useInterval(() => {
    if (isActive && !isLoading) {
      revalidate();
    }
  }, 1000);

  return (
    <List.Item
      id="network"
      title="Network"
      icon={Icon.Network}
      accessories={[
        {
          text: data
            ? `↓ ${formatBytes(data.download)}/s ↑ ${formatBytes(data.upload)}/s`
            : isActive
              ? "Loading…"
              : "—",
        },
      ]}
      detail={
        <List.Item.Detail
          isLoading={isLoading && !data}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Download Speed"
                text={`${!data ? "0 B" : formatBytes(data.download)}/s`}
              />
              <List.Item.Detail.Metadata.Label
                title="Upload Speed"
                text={`${!data ? "0 B" : formatBytes(data.upload)}/s`}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Process Name" />
              {data && data.processList.length > 0
                ? data.processList.map((value, index) => {
                    return (
                      <List.Item.Detail.Metadata.Label
                        key={index}
                        title={`${index + 1} -> ${value[0]}`}
                        text={`↓ ${formatBytes(value[1])}/s   ↑ ${formatBytes(value[2])}/s`}
                      />
                    );
                  })
                : undefined}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={<Actions radioButtonNumber={5} />}
    />
  );
}
