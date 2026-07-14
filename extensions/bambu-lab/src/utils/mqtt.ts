import { useEffect, useState, useRef } from "react";
import mqtt, { MqttClient } from "mqtt";
import { BambuPreferences } from "./types";
import { MQTT_CONFIG, SEQUENCE_IDS } from "./constants";

export interface UseMQTTOptions {
  onConnect?: (client: MqttClient) => void;
  onMessage?: (topic: string, message: Buffer) => void;
  subscribeToReports?: boolean;
  pushAllOnConnect?: boolean;
}

export function useMQTT(preferences: BambuPreferences, options: UseMQTTOptions = {}) {
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
    const host = `mqtts://${preferences.ipAddress}:${MQTT_CONFIG.PORT}`;
    setIsConnecting(true);

    const mqttClient = mqtt.connect(host, {
      username: MQTT_CONFIG.USERNAME,
      password: preferences.accessCode,
      // Necessary for Bambu Lab printers which use self-signed certificates on local LAN.
      // Standard TLS verification fails because the certificate is not trusted by the OS.
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
            sequence_id: SEQUENCE_IDS.PUSH_ALL,
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
      mqttClient.end();
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
    while (attempts < MQTT_CONFIG.MAX_CONNECTION_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, MQTT_CONFIG.CONNECTION_CHECK_INTERVAL_MS));
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
