import { useEffect, useState } from "react";
import { Color, List, showToast, Toast } from "@raycast/api";
import { getNetworkData } from "./NetworkUtils";
import { useInterval } from "usehooks-ts";
import { formatBytes, isObjectEmpty } from "../utils";
import { ExecError, NetworkMonitorState } from "../Interfaces";
import { Actions } from "../components/Actions";

export default function NetworkMonitor() {
  const [error, setError] = useState<ExecError>();
  const [state, setState] = useState<NetworkMonitorState>({
    upload: 0,
    download: 0,
    processList: [],
    prevProcess: {},
  });

  const sortFunction = (a: [string, number, number], b: [string, number, number]): number => {
    const minA = Math.min(a[1], a[2]);
    const maxA = Math.max(a[1], a[2]);
    const minB = Math.min(b[1], b[2]);
    const maxB = Math.max(b[1], b[2]);
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
  const getTopProcess = (arr: [string, number, number][]): [string, number, number][] => {
    arr.sort(sortFunction);
    arr = arr.slice(0, 5);
    return arr;
  };

  useInterval(async () => {
    getNetworkData()
      .then((currProcess: { [key: string]: number[] }) => {
        const prevProcess: { [key: string]: number[] } = state.prevProcess;
        let newUpload = 0;
        let newDownload = 0;
        let newProcessList: [string, number, number][] = [];
        if (!isObjectEmpty(prevProcess)) {
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
      })
      .catch((err: ExecError) => {
        setError(err);
      });
  }, 1000);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Couldn't fetch Network Info [Error Code: " + error.code + "]",
        message: error.stderr,
      });
    }
  }, [error]);

  return (
    <>
      <List.Item
        title={`Network`}
        icon={{ source: "connection.png", tintColor: Color.Blue }}
        accessories={[
          {
            text: state.processList.length
              ? "↓ " + formatBytes(state.download) + "/s ↑ " + formatBytes(state.upload) + " /s"
              : "Loading...",
          },
        ]}
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label
                  title="Download Speed"
                  text={(state.processList.length === 0 ? "0 B" : formatBytes(state.download)) + "/s"}
                />
                <List.Item.Detail.Metadata.Label
                  title="Upload Speed"
                  text={(state.processList.length === 0 ? "0 B" : formatBytes(state.upload)) + "/s"}
                />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Process Name" />
                {state.processList.length > 0 &&
                  state.processList.map((value, index) => {
                    return (
                      <List.Item.Detail.Metadata.Label
                        key={index}
                        title={index + 1 + ".    " + value[0]}
                        text={"↓ " + formatBytes(value[1]) + "/s   ↑ " + formatBytes(value[2]) + " /s"}
                      />
                    );
                  })}
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={<Actions />}
      />
    </>
  );
}
