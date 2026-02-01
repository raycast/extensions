import { useEffect, useState, useRef } from "react";
import mqtt, { MqttClient } from "mqtt";
import { Preferences } from "./types";

export interface UseMQTTOptions {
  onConnect?: (client: MqttClient) => void;
  onMessage?: (topic: string, message: Buffer) => void;
  subscribeToReports?: boolean;
  pushAllOnConnect?: boolean;
}

export function useMQTT(preferences: Preferences, options: UseMQTTOptions = {}) {
  const { onConnect, onMessage, subscribeToReports = true, pushAllOnConnect = false } = options;

  const [client, setClient] = useState<MqttClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const clientRef = useRef<MqttClient | null>(null);
  const onConnectRef = useRef(onConnect);
  const onMessageRef = useRef(onMessage);

  // Keep callbacks refs up to date
  useEffect(() => {
    onConnectRef.current = onConnect;
    onMessageRef.current = onMessage;
  }, [onConnect, onMessage]);

  useEffect(() => {
    const host = `mqtts://${preferences.ipAddress}:8883`;
    setIsConnecting(true);

    const mqttClient = mqtt.connect(host, {
      username: "bblp",
      password: preferences.accessCode,
      rejectUnauthorized: false,
    });

    mqttClient.on("connect", () => {
      setIsConnected(true);
      setIsConnecting(false);

      if (subscribeToReports) {
        mqttClient.subscribe(`device/${preferences.serialNumber}/report`);
      }

      if (pushAllOnConnect) {
        const payload = {
          pushing: {
            sequence_id: "0",
            command: "pushall",
            version: 1,
            push_target: 1,
          },
        };
        mqttClient.publish(`device/${preferences.serialNumber}/request`, JSON.stringify(payload));
      }

      onConnectRef.current?.(mqttClient);
    });

    mqttClient.on("error", () => {
      setIsConnected(false);
      setIsConnecting(false);
    });

    if (onMessageRef.current) {
      mqttClient.on("message", (topic, message) => {
        onMessageRef.current?.(topic, message);
      });
    }

    setClient(mqttClient);
    clientRef.current = mqttClient;

    return () => {
      if (mqttClient) {
        mqttClient.end();
      }
    };
  }, [preferences.ipAddress, preferences.accessCode, preferences.serialNumber, subscribeToReports, pushAllOnConnect]);

  const waitForConnection = async (): Promise<boolean> => {
    if (isConnected && clientRef.current?.connected) return true;
    let attempts = 0;
    while (attempts < 50) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
      if (clientRef.current?.connected) {
        setIsConnected(true);
        return true;
      }
    }
    return false;
  };

  return {
    client,
    isConnected,
    isConnecting,
    waitForConnection,
  };
}
