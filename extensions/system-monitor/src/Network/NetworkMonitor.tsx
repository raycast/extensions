import { useState } from "react";
import { List } from "@raycast/api";
import { getNetworkData } from "./NetworkUtils";
import { useInterval } from "usehooks-ts";
import { formatBytes } from "../Power/utils";

export default function NetworkMonitor() {
  const [state, setState] = useState({
    upload: "Loading...",
    download: "Loading...",
    processList: [],
    prevProcess: {},
  });

  const sortFunction = (a, b) => {
    let minA = Math.min(a[1], a[2]);
    let maxA = Math.max(a[1], a[2]);
    let minB = Math.min(b[1], b[2]);
    let maxB = Math.max(b[1], b[2]);
    if (maxA > maxB) {
      return -1;
    } else if (maxB > maxA) {
      return 1;
    } else if (minA > minB) {
      return -1;
    } else if (minB > minA) {
      return 1;
    } else {
      return 0;
    }
  };
  const getTopProcess = (processList) => {
    processList.sort(sortFunction);
    processList = processList.slice(0, 5);
    return processList;
  };

  useInterval(async () => {
    const currProcess = await getNetworkData();
    const prevProcess = state.prevProcess;
    let newUpload = 0;
    let newDownload = 0;
    let newProcessList = [];
    if (prevProcess.length !== 0) {
      for (const key in currProcess) {
        let down = currProcess[key][0] - (key in prevProcess ? prevProcess[key][0] : 0);
        if (down < 0) {
          down = 0;
        }
        let up = currProcess[key][1] - (key in prevProcess ? prevProcess[key][1] : 0);
        if (up < 0) {
          up = 0;
        }
        newDownload += down;
        newUpload += up;
        if (key in prevProcess) {
          newProcessList.push([key, down, up]);
        }
      }
      newProcessList = getTopProcess(newProcessList);
    }
    setState((prevState) => {
      return {
        ...prevState,
        upload: newUpload,
        download: newDownload,
        processList: newProcessList,
        prevProcess: currProcess,
      };
    });
  }, 1000);

  return (
    <>
      <List.Item
        title={`📶️ Network`}
        subtitle={
          state.processList.length
            ? "D : " + formatBytes(state.download) + "/s U : " + formatBytes(state.upload) + " /s"
            : "Loading..."
        }
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label
                  title="Upload Speed"
                  text={(state.processList.length === 0 ? "0 B" : formatBytes(state.upload)) + "/s"}
                />
                <List.Item.Detail.Metadata.Label
                  title="Download Speed"
                  text={(state.processList.length === 0 ? "0 B" : formatBytes(state.download)) + "/s"}
                />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Process Name" />
                {state.processList &&
                  state.processList.map((value, index) => {
                    return (
                      <List.Item.Detail.Metadata.Label
                        key={index}
                        title={index + 1 + ".    " + value[0]}
                        text={"D : " + formatBytes(value[1]) + "/s   U : " + formatBytes(value[2]) + " /s"}
                      />
                    );
                  })}
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    </>
  );
}
