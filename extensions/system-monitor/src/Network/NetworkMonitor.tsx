import { useState, useEffect, useRef } from "react";
import { List } from "@raycast/api";
import { getNetworkData } from "./NetworkUtils";

export default function NetworkMonitor() {
  const savedCallback = useRef();
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
    processList.forEach((value, index) => {
      processList[index][1] = Math.round(value[1] / 1024);
      processList[index][2] = Math.round(value[2] / 1024);
    });
    console.log(processList);
    return processList;
  };

  const callback = async () => {
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
      console.log(newProcessList);
    }
    setState((prevState) => {
      return {
        ...prevState,
        upload: Math.round(newUpload / 1024),
        download: Math.round(newDownload / 1024),
        processList: newProcessList,
        prevProcess: currProcess,
      };
    });
  };

  useEffect(() => {
    savedCallback.current = callback;
  });

  useEffect(() => {
    const tick = () => {
      savedCallback.current();
    };
    let monitorInterval = setInterval(tick, 1000);
    return () => {
      clearInterval(monitorInterval);
    };
  }, []);

  return (
    <>
      <List.Item
        title={`📶️ Network`}
        subtitle={
          state.processList.length ? "D : " + state.download + " KB/s U : " + state.upload + " KB/s" : "Loading..."
        }
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label
                  title="Upload Speed"
                  text={(state.processList.length === 0 ? 0 : state.upload) + " KB/s"}
                />
                <List.Item.Detail.Metadata.Label
                  title="Download Speed"
                  text={(state.processList.length === 0 ? 0 : state.download) + " KB/s"}
                />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Process Name" />
                {state.processList &&
                  state.processList.map((value, index) => {
                    return (
                      <List.Item.Detail.Metadata.Label
                        key={index}
                        title={index + 1 + ".    " + value[0]}
                        text={"D : " + value[1] + " KB/s   U : " + value[2] + " KB/s"}
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
