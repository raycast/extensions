import { useRef } from "react";
import { Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useInterval } from "usehooks-ts";

import { Actions } from "../components/Actions";
import { formatBytes, isObjectEmpty } from "../utils";
import { getNetworkData, getTopProcess } from "./NetworkUtils";

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
      actions={<Actions radioButtonNumber={5} />}
    />
  );
}
