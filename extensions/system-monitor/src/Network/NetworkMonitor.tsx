import { useRef } from "react";
import { Icon, List } from "@raycast/api";
import { getNetworkData } from "./NetworkUtils";
import { useInterval } from "usehooks-ts";
import { formatBytes, isObjectEmpty } from "../utils";
import { Actions } from "../components/Actions";
import { usePromise } from "@raycast/utils";

const sortFunction = (a: [string, number, number], b: [string, number, number]): number => {
  const minA = Math.min(a[1], a[2]);
  const maxA = Math.max(a[1], a[2]);
  const minB = Math.min(b[1], b[2]);
  const maxB = Math.max(b[1], b[2]);

  switch (true) {
    case maxA > maxB || minA > minB:
      return -1;
    case maxB > maxA || minB > minA:
      return 1;
  }

  return 0;
};

const getTopProcess = (arr: [string, number, number][]): [string, number, number][] => {
  arr.sort(sortFunction);
  arr = arr.slice(0, 5);

  return arr;
};

export default function NetworkMonitor() {
  const prevProcess = useRef<{ [key: string]: number[] }>({});
  const { data, isLoading, revalidate } = usePromise(async () => {
    const currProcess = await getNetworkData();
    let upload = 0;
    let download = 0;
    let processList: [string, number, number][] = [];

    if (!isObjectEmpty(prevProcess.current)) {
      for (const key in currProcess) {
        let down = currProcess[key][0] - (key in prevProcess.current ? prevProcess.current[key][0] : 0);

        if (down < 0) {
          down = 0;
        }

        let up = currProcess[key][1] - (key in prevProcess.current ? prevProcess.current[key][1] : 0);

        if (up < 0) {
          up = 0;
        }

        download += down;
        upload += up;

        if (key in prevProcess.current) {
          processList.push([key, down, up]);
        }
      }

      processList = getTopProcess(processList);
    }

    prevProcess.current = currProcess;

    return {
      upload,
      download,
      processList,
    };
  });

  useInterval(revalidate, 1000);

  return (
    <>
      <List.Item
        id="network"
        title="Network"
        icon={Icon.Network}
        accessories={[
          {
            text: data ? `↓ ${formatBytes(data.download)}/s ↑ ${formatBytes(data.upload)}/s` : "Loading…",
          },
        ]}
        detail={
          <List.Item.Detail
            isLoading={isLoading}
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
        actions={<Actions />}
      />
    </>
  );
}
