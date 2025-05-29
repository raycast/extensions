import { useCallback, useEffect, useRef, useState } from "react";
import WebSocket from "ws";
import { z } from "zod";
import { Message } from "./useMessage";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { authHeaders, endpointWithPath, websocketEndpoint } from "../utils";
import { showFailureToast } from "@raycast/utils";
import Style = Toast.Style;

export function useStream() {
  const { token, endpoint } = getPreferenceValues<Preferences.Messages>();
  const [data, setData] = useState<z.infer<typeof Message> | undefined>();
  const socketRef = useRef<WebSocket | null>(null);

  const connectWebSocket = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState < 2) {
      // 0: CONNECTING, 1: OPEN
      socketRef.current.close();
    }
    const socket = new WebSocket(endpointWithPath(websocketEndpoint(endpoint), "/stream"), {
      ...authHeaders(token),
    });
    socketRef.current = socket;
    socketRef.current.onopen = async () => {
      await showToast({ style: Style.Success, title: "Stream connected" });
    };
    socketRef.current.onmessage = async (event) => {
      await showToast({ style: Style.Success, title: "New message arrive" });
      setData({ ...JSON.parse(event.data.toString()), _new: true });
    };
    socketRef.current.onerror = async (error) => {
      if (socketRef.current === socket) {
        await showFailureToast(error.error, { title: "Stream error" });
      }
    };
  }, []);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connectWebSocket]);

  return { data };
}
