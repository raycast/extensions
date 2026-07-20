import * as mqtt from "mqtt";
import { PowerMode, HVACMode, FanMode, PresetMode, SwingMode, DisplayMode, ConvertiMode } from "./enums";
import * as constants from "./constants";

type MqttPayload = Record<string, unknown>;

export class MirAIeBroker {
  private static readonly HOST = constants.MQTT_HOST;
  private static readonly PORT = constants.MQTT_PORT;
  private static readonly USE_SSL = constants.MQTT_USE_SSL;

  private static instanceCounter = 0; // Track instances
  private instanceId: number;

  private statusCallbacks: Map<string, (data: unknown) => void> = new Map();
  private commandTopics: string[] = [];
  private connectionCallbacks: Set<(isConnected: boolean) => void> = new Set();
  private errorCallbacks: Set<(error: Error) => void> = new Set();
  private reconnectAttempts = 0;
  private connectionCount = 0; // Track connection events
  client?: mqtt.MqttClient;

  constructor() {
    MirAIeBroker.instanceCounter++;
    this.instanceId = MirAIeBroker.instanceCounter;
  }

  registerDeviceCallback(topic: string, callback: (data: unknown) => void): void {
    this.statusCallbacks.set(topic, callback);
  }

  removeDeviceCallback(topic: string): void {
    this.statusCallbacks.delete(topic);
  }

  registerConnectionCallback(callback: (isConnected: boolean) => void): void {
    this.connectionCallbacks.add(callback);
    callback(this.isConnected());
  }

  removeConnectionCallback(callback: (isConnected: boolean) => void): void {
    this.connectionCallbacks.delete(callback);
  }

  registerErrorCallback(callback: (error: Error) => void): void {
    this.errorCallbacks.add(callback);
  }

  removeErrorCallback(callback: (error: Error) => void): void {
    this.errorCallbacks.delete(callback);
  }

  private notifyError(error: Error): void {
    for (const callback of this.errorCallbacks) {
      callback(error);
    }
  }

  isConnected(): boolean {
    return this.client?.connected === true;
  }

  setTopics(topics: string[]): void {
    const previousTopics = new Set(this.commandTopics);
    const nextTopics = new Set(topics);

    this.commandTopics = topics;

    if (!this.isConnected()) {
      return;
    }

    for (const topic of previousTopics) {
      if (!nextTopics.has(topic)) {
        this.client?.unsubscribe(topic);
      }
    }

    for (const topic of nextTopics) {
      if (!previousTopics.has(topic)) {
        this.client?.subscribe(topic);
      }
    }
  }

  private async onConnect(): Promise<void> {
    this.connectionCount++;
    this.reconnectAttempts = 0;

    for (const topic of this.commandTopics) {
      this.client?.subscribe(topic);
    }

    this.notifyConnectionChange();
  }

  private onMessage(topic: string, message: Buffer): void {
    try {
      const parsed = JSON.parse(message.toString());

      const func = this.statusCallbacks.get(topic);
      if (func) {
        func(parsed);
      }
    } catch (error) {
      console.error("Failed to parse MirAIe MQTT message", error);
    }
  }

  async connect(username: string, accessToken: string, getToken: () => Promise<string>): Promise<void> {
    if (this.client && !this.client.disconnected) {
      return;
    }

    let password = accessToken;

    const clientId = `raycast-miraie-ac-${this.instanceId}-${Math.floor(Math.random() * 1000)}`;

    const connectOptions: mqtt.IClientOptions = {
      host: MirAIeBroker.HOST,
      port: MirAIeBroker.PORT,
      protocol: MirAIeBroker.USE_SSL ? "mqtts" : "mqtt",
      username: username,
      password: password,
      clientId: clientId,
      rejectUnauthorized: true,
      reconnectPeriod: 5000,
      connectTimeout: 30000,
      keepalive: 60,
    };

    this.client = mqtt.connect(connectOptions);

    this.client.on("connect", async () => {
      await this.onConnect();
    });

    this.client.on("reconnect", () => {
      this.reconnectAttempts++;
    });

    this.client.on("message", (topic, message) => {
      this.onMessage(topic, message);
    });

    this.client.on("error", async (error) => {
      if (error.message.includes("Not authorized") || error.message.includes("auth")) {
        try {
          password = await getToken();
          if (this.client) {
            this.client.options.password = password;
          }
        } catch (tokenError) {
          console.error("Failed to refresh MirAIe MQTT token", tokenError);
          this.notifyError(tokenError instanceof Error ? tokenError : new Error(String(tokenError)));
        }
      }

      this.notifyConnectionChange();
    });

    this.client.on("offline", () => {
      this.notifyConnectionChange();
    });

    this.client.on("close", () => {
      this.notifyConnectionChange();
    });

    this.client.on("disconnect", () => {
      this.notifyConnectionChange();
    });

    this.client.on("end", () => {
      this.notifyConnectionChange();
    });
  }

  disconnect(): void {
    if (this.client) {
      this.client.end(false, {}, () => undefined);
    }
  }

  private notifyConnectionChange(): void {
    const connected = this.isConnected();
    for (const callback of this.connectionCallbacks) {
      callback(connected);
    }
  }

  private async publish(topic: string, payload: MqttPayload): Promise<void> {
    if (!this.client) {
      throw new Error("MirAIe broker is not initialized yet");
    }

    if (!this.client.connected) {
      throw new Error("MirAIe broker is still connecting. Please try again in a moment.");
    }

    await new Promise<void>((resolve, reject) => {
      this.client?.publish(topic, JSON.stringify(payload), (error?: Error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  // Rest of methods...
  private buildBasePayload(): MqttPayload {
    return {
      ki: constants.MQTT_PAYLOAD_KI,
      cnt: constants.MQTT_PAYLOAD_CNT,
      sid: constants.MQTT_PAYLOAD_SID,
    };
  }

  // Power
  private buildPowerPayload(power: PowerMode): MqttPayload {
    const payload = this.buildBasePayload();
    payload.ps = power.toString();
    return payload;
  }

  async setPower(topic: string, power: PowerMode): Promise<void> {
    await this.publish(topic, this.buildPowerPayload(power));
  }

  // Temperature
  private buildTemperaturePayload(temperature: number): MqttPayload {
    const payload = this.buildBasePayload();
    payload.actmp = temperature.toString();
    return payload;
  }

  async setTemperature(topic: string, temperature: number): Promise<void> {
    await this.publish(topic, this.buildTemperaturePayload(temperature));
  }

  // HVAC Mode
  private buildHvacModePayload(mode: HVACMode): MqttPayload {
    const payload = this.buildBasePayload();
    payload.acmd = mode.toString();
    return payload;
  }

  async setHvacMode(topic: string, mode: HVACMode): Promise<void> {
    await this.publish(topic, this.buildHvacModePayload(mode));
  }

  // Fan Mode
  private buildFanModePayload(mode: FanMode): MqttPayload {
    const payload = this.buildBasePayload();
    payload.acfs = mode.toString();
    return payload;
  }

  async setFanMode(topic: string, mode: FanMode): Promise<void> {
    await this.publish(topic, this.buildFanModePayload(mode));
  }

  // Preset Mode
  private buildPresetModePayload(mode: PresetMode): MqttPayload {
    const payload = this.buildBasePayload();

    if (mode === PresetMode.NONE) {
      payload.acem = "off";
      payload.acpm = "off";
      payload.acec = "off";
      payload.cnv = 0;
    } else if (mode === PresetMode.ECO) {
      payload.acem = "on";
      payload.acpm = "off";
      payload.acec = "off";
      payload.actmp = 26.0;
      payload.cnv = 0;
    } else if (mode === PresetMode.BOOST) {
      payload.acem = "off";
      payload.acpm = "on";
      payload.acec = "off";
      payload.cnv = 0;
    } else if (mode === PresetMode.CLEAN) {
      payload.acem = "off";
      payload.acpm = "off";
      payload.acec = "on";
      payload.cnv = 0;
    }
    return payload;
  }

  async setPresetMode(topic: string, mode: PresetMode): Promise<void> {
    await this.publish(topic, this.buildPresetModePayload(mode));
  }

  // Vertical Swing Mode
  private buildVSwingModePayload(mode: SwingMode): MqttPayload {
    const payload = this.buildBasePayload();
    payload.acvs = mode.valueOf();
    return payload;
  }

  async setVSwingMode(topic: string, mode: SwingMode): Promise<void> {
    await this.publish(topic, this.buildVSwingModePayload(mode));
  }

  // Horizontal Swing Mode
  private buildHSwingModePayload(mode: SwingMode): MqttPayload {
    const payload = this.buildBasePayload();
    payload.achs = mode.valueOf();
    return payload;
  }

  async setHSwingMode(topic: string, mode: SwingMode): Promise<void> {
    await this.publish(topic, this.buildHSwingModePayload(mode));
  }

  // Display Mode
  private buildDisplayModePayload(mode: DisplayMode): MqttPayload {
    const payload = this.buildBasePayload();
    payload.acdc = mode.toString();
    return payload;
  }

  async setDisplayMode(topic: string, mode: DisplayMode): Promise<void> {
    await this.publish(topic, this.buildDisplayModePayload(mode));
  }

  // Converti Mode
  private buildConvertiModePayload(mode: ConvertiMode): MqttPayload {
    const payload = this.buildBasePayload();
    payload.acem = "off";
    payload.acpm = "off";
    payload.cnv = mode.valueOf();
    return payload;
  }

  async setConvertiMode(topic: string, mode: ConvertiMode): Promise<void> {
    await this.publish(topic, this.buildConvertiModePayload(mode));
  }

  // On and Off timers
  private buildTimerPayload(timerValue: number, currentTimerValues: number[], timerType = "OFF") {
    const basePayload = this.buildBasePayload();
    const newActm = [...currentTimerValues];
    if (timerType === "OFF") {
      newActm.splice(0, 1, timerValue);
    } else {
      newActm.splice(1, 1, timerValue);
    }
    basePayload.actm = newActm;
    return basePayload;
  }

  async setOffTimer(topic: string, timerValue: number, currentTimerValues: number[]) {
    await this.publish(topic, this.buildTimerPayload(timerValue, currentTimerValues));
  }

  async setOnTimer(topic: string, timerValue: number, currentTimerValues: number[]) {
    await this.publish(topic, this.buildTimerPayload(timerValue, currentTimerValues, "ON"));
  }
}
