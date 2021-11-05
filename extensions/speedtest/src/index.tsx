import { Color, Icon, List, showToast, ToastStyle } from "@raycast/api";
import { useState, useEffect } from "react";
import { isSpeedtestCliInstalled, Result, runSpeedTest } from "./lib/speedtest";
import { pingToString, speedToString } from "./lib/utils";

export default function SpeedtestList() {
  const { result, error, isLoading } = useSpeedtest();
  if (error) {
    showToast(ToastStyle.Failure, "Speedtest failed", error);
  }
  return (
    <List isLoading={isLoading}>
      <List.Item
        title="Internet Service Provider"
        icon={{ source: Icon.Globe, tintColor: Color.Green }}
        accessoryTitle={`${result.isp ? result.isp : "?"}`}
      />
      <List.Item
        title="Server"
        icon={{ source: "server.png" }}
        accessoryTitle={`${result.serverName ? result.serverName : "?"}`}
      />
      <List.Item
        title="Ping"
        icon={{ source: Icon.LevelMeter, tintColor: Color.Blue }}
        accessoryTitle={`${pingToString(result.ping)}`}
      />
      <List.Item
        title="Download"
        icon={{ source: "download.png", tintColor: Color.Blue }}
        accessoryTitle={`${speedToString(result.download)}`}
      />
      <List.Item
        title="Upload"
        icon={{ source: "download.png", tintColor: "#bf71ff" }}
        accessoryTitle={`${speedToString(result.upload)}`}
      />
    </List>
  );
}

function useSpeedtest(): { result: Result; error: string | undefined; isLoading: boolean } {
  const [result, setResult] = useState<Result>({
    isp: undefined,
    location: undefined,
    serverName: undefined,
    download: undefined,
    upload: undefined,
    ping: undefined,
  });
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  let cancel = false;
  useEffect(() => {
    function runTest() {
      try {
        if (!isSpeedtestCliInstalled()) {
          throw Error("Speedtest CLI is not installed");
        }
        runSpeedTest(
          (r: Result) => {
            if (!cancel) {
              setResult({ ...r });
            }
          },
          (r: Result) => {
            if (!cancel) {
              setResult({ ...r });
              setIsLoading(false);
            }
          },
          (err: Error) => {
            if (!cancel) {
              setError(err instanceof Error ? err.message : "unknown error");
            }
          }
        );
      } catch (err) {
        if (!cancel) {
          setError(err instanceof Error ? err.message : "unknown error");
          setIsLoading(false);
        }
      }
    }
    runTest();
    return () => {
      cancel = true;
    };
  }, []);
  return { result, error, isLoading };
}
