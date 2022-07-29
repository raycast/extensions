import { useEffect, useRef, useState } from "react";
import { buildWSURLBase, showFailureToast, wait } from "../../utils";
import { ErrorHandler } from "../../utils/error";
import WebSocket = require("ws");

const stateArr = [
  { key: 0, value: "connecting" },
  { key: 1, value: "connection ready" },
  { key: 2, value: "connection is closing" },
  { key: 3, value: "connection closed or error" },
];

const useWebsocket = (endpoint: string, params = {}) => {
  const ws = useRef<WebSocket | null>(null);
  const isMounted = useRef(true);
  const [retry, setRetry] = useState(0);
  const [url, setUrl] = useState("");
  const [wsData, setMessage] = useState("");
  const [readyState, setReadyState] = useState({ key: 0, value: "connecting" });

  const creatWebSocket = () => {
    buildWSURLBase(endpoint, params)
      .then((url: string) => {
        isMounted.current && setUrl(url);
        ws.current = new WebSocket(url);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ws.current.onopen = (e) => isMounted.current && setReadyState(stateArr[ws.current?.readyState ?? 0]);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ws.current.onclose = (e) => {
          isMounted.current && setReadyState(stateArr[ws.current?.readyState ?? 0]);
        };
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ws.current.onerror = (e) => {
          isMounted.current && setReadyState(stateArr[ws.current?.readyState ?? 0]);
        };

        ws.current.onmessage = (e: WebSocket.MessageEvent) => {
          isMounted.current && setMessage(e.data.toString());
        };
      })
      .catch(ErrorHandler);
  };

  const webSocketInit = () => {
    if (!ws.current || ws.current.readyState === 3) {
      creatWebSocket();
    }
  };

  const closeWebSocket = () => {
    ws.current?.close();
  };

  const reconnect = () => {
    // TODO: make max retry time configured
    if (isMounted.current && retry <= 10) {
      console.log(`reconnect after ${retry}s(${retry}/10)`);
      showFailureToast(`Reconnect after ${retry}s(${retry}/10)`, "");
      wait(retry * 1000).then(() => {
        console.log("reconnect");
        isMounted.current && setRetry((oldRetry) => oldRetry + 1);
        try {
          closeWebSocket();
          ws.current = null;
          isMounted.current && creatWebSocket();
        } catch (e) {
          showFailureToast("Websocket failed", e);
        }
      });
    }
  };

  useEffect(() => {
    webSocketInit();
    return () => {
      ws.current?.close();
      isMounted.current = false;
    };
  }, [ws]);

  return {
    url,
    wsData,
    readyState,
    closeWebSocket,
    reconnect,
  };
};
export default useWebsocket;
