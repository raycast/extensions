import { useEffect, useState } from "react";
import { getFormatDateString } from "../../utils";
import { ConnectionsT, ConnectionT, LogLevelT, LogsT, LogT, TrafficT } from "../types";
import useWebsocket from "./util";

function GetTraffic(): [string, TrafficT] {
  const [detail, setDetail] = useState<TrafficT>({
    up: 0,
    down: 0,
  });
  const { url, wsData, readyState, reconnect } = useWebsocket("/traffic");
  useEffect(() => {
    if (readyState.key === 3) {
      reconnect();
    }
    if (wsData) {
      const message: TrafficT = JSON.parse(wsData);
      setDetail(message);
    }
  }, [wsData, readyState]);
  return [url, detail];
}

function GetConnections(): [string, ConnectionsT] {
  const [total, setTotal] = useState<ConnectionsT>({
    downloadTotal: 0,
    uploadTotal: 0,
    connections: [] as Array<ConnectionT>,
  });
  const { url, wsData, readyState, reconnect } = useWebsocket("/connections");
  useEffect(() => {
    if (readyState.key === 3) {
      reconnect();
    }
    if (wsData) {
      const message: ConnectionsT = JSON.parse(wsData);
      setTotal(message);
    }
  }, [wsData, readyState]);
  return [url, total];
}

function GetLogs(logLevel: LogLevelT): [string, LogsT] {
  const [logs, setLogs] = useState<LogsT>([]);
  const { url, wsData, readyState, reconnect, closeWebSocket } = useWebsocket("/logs", { level: logLevel });
  useEffect(() => {
    if (readyState.key === 3) {
      reconnect();
    }
    if (wsData) {
      const message: LogT = JSON.parse(wsData);
      setLogs((logs) => [
        {
          ...message,
          time: getFormatDateString(),
        },
        ...logs,
      ]);
    }
  }, [wsData, readyState]);
  useEffect(() => {
    if (url) {
      closeWebSocket();
      // showToast(ToastStyle.Success, "Swith LogLevel", logLevel);
      reconnect();
    }
  }, [logLevel]);
  return [url, logs];
}

export { GetTraffic, GetConnections, GetLogs };
