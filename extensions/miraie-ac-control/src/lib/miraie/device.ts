import { MirAIeBroker } from "./broker";
import { PowerMode, FanMode, SwingMode, DisplayMode, HVACMode, PresetMode, ConvertiMode } from "./enums";
import { toFloat } from "./utils";

export class DeviceStatus {
  isOnline: boolean;
  temperature: number;
  roomTemperature: number;
  powerMode: PowerMode;
  fanMode: FanMode;
  vSwingMode: SwingMode;
  hSwingMode: SwingMode;
  displayMode: DisplayMode;
  hvacMode: HVACMode;
  presetMode: PresetMode;
  convertiMode: ConvertiMode;
  connectedTime: number;
  offTimer: number;
  onTimer: number;

  constructor(
    isOnline: boolean,
    temperature: number,
    roomTemperature: number,
    powerMode: PowerMode,
    fanMode: FanMode,
    vSwingMode: SwingMode,
    hSwingMode: SwingMode,
    displayMode: DisplayMode,
    hvacMode: HVACMode,
    presetMode: PresetMode,
    convertiMode: ConvertiMode,
    connectedTime: number,
    offTimer: number,
    onTimer: number,
  ) {
    this.isOnline = isOnline;
    this.temperature = temperature;
    this.roomTemperature = roomTemperature;
    this.powerMode = powerMode;
    this.fanMode = fanMode;
    this.vSwingMode = vSwingMode;
    this.hSwingMode = hSwingMode;
    this.displayMode = displayMode;
    this.hvacMode = hvacMode;
    this.presetMode = presetMode;
    this.convertiMode = convertiMode;
    this.connectedTime = connectedTime;
    this.offTimer = offTimer;
    this.onTimer = onTimer;
  }

  toString(): string {
    return (
      `Is online? - ${this.isOnline}\n` +
      `Temperature: ${this.temperature}\n` +
      `Room temperature: ${this.roomTemperature}\n` +
      `Power mode: ${this.powerMode}\n` +
      `Fan mode: ${this.fanMode}\n` +
      `Vertical swing mode: ${this.vSwingMode}\n` +
      `Horizontal swing mode: ${this.hSwingMode}\n` +
      `Display mode: ${this.displayMode}\n` +
      `Hvac mode: ${this.hvacMode}\n` +
      `Preset mode: ${this.presetMode}\n` +
      `Converti mode: ${this.convertiMode}\n`
    );
  }
}

export class DeviceDetails {
  modelName: string;
  macAddress: string;
  category: string;
  brand: string;
  firmwareVersion: string;
  serialNumber: string;
  modelNumber: string;
  productSerialNumber: string;

  constructor(
    modelName: string,
    macAddress: string,
    category: string,
    brand: string,
    firmwareVersion: string,
    serialNumber: string,
    modelNumber: string,
    productSerialNumber: string,
  ) {
    this.modelName = modelName;
    this.macAddress = macAddress;
    this.category = category;
    this.brand = brand;
    this.firmwareVersion = firmwareVersion;
    this.serialNumber = serialNumber;
    this.modelNumber = modelNumber;
    this.productSerialNumber = productSerialNumber;
  }

  toString(): string {
    return (
      `Brand: ${this.brand}\n` +
      `Category: ${this.category}\n` +
      `Model Name: ${this.modelName}\n` +
      `Model #: ${this.modelNumber}\n` +
      `MAC address: ${this.macAddress}\n` +
      `Firmware version: ${this.firmwareVersion}\n` +
      `Serial number: ${this.serialNumber}\n` +
      `Model number: ${this.modelNumber}\n` +
      `Product serial number: ${this.productSerialNumber}\n`
    );
  }
}

export class PowerConsumptionDetails {
  dailyTotal: number;
  weeklyTotal: number;
  monthlyTotal: number;

  constructor(dailyTotal: number, weeklyTotal: number, monthlyTotal: number) {
    this.dailyTotal = dailyTotal;
    this.weeklyTotal = weeklyTotal;
    this.monthlyTotal = monthlyTotal;
  }

  toString(): string {
    return (
      `daily Total: ${this.dailyTotal}\n` +
      `weekly Total: ${this.weeklyTotal}\n` +
      `monthly Total: ${this.monthlyTotal}\n`
    );
  }

  getTodayTotal(): number {
    return Number(this.dailyTotal.toFixed(2));
  }

  getWeeklyTotal(): number {
    return Number(this.weeklyTotal.toFixed(2));
  }

  getMonthlyTotal(): number {
    return Number(this.monthlyTotal.toFixed(2));
  }
}

type Space = {
  spaceName: string;
  spaceId: string;
  spaceType: string;
  members: string[];
};

export type DeviceJSON = {
  id: string;
  name: string;
  friendlyName: string;
  space: Space;
  controlTopic: string;
  statusTopic: string;
  connectionStatusTopic: string;
  status?: {
    isOnline: boolean;
    temperature: number;
    roomTemperature: number;
    powerMode: PowerMode;
    fanMode: FanMode;
    vSwingMode: SwingMode;
    hSwingMode: SwingMode;
    displayMode: DisplayMode;
    hvacMode: HVACMode;
    presetMode: PresetMode;
    convertiMode: ConvertiMode;
    connectedTime: number;
    offTimer: number;
    onTimer: number;
  };
  details?: {
    modelName: string;
    macAddress: string;
    category: string;
    brand: string;
    firmwareVersion: string;
    serialNumber: string;
    modelNumber: string;
    productSerialNumber: string;
  };
  powerConsumptionDetails?: {
    dailyTotal: number;
    weeklyTotal: number;
    monthlyTotal: number;
  };
};

type DeviceStatusPayload = {
  onlineStatus?: string;
  actmp?: string | number | null;
  rmtmp?: string | number | null;
  ps: PowerMode;
  acfs: FanMode;
  acvs: SwingMode;
  achs: SwingMode;
  acdc: DisplayMode;
  acmd: HVACMode;
  acpm?: string;
  acem?: string;
  acec?: string;
  cnv?: number;
  connectedTime: number;
  actm?: number[];
};

type DeviceConnectionPayload = {
  onlineStatus?: string;
};

export class Device {
  id: string;
  name: string;
  friendlyName: string;
  space: Space;
  controlTopic: string;
  statusTopic: string;
  connectionStatusTopic: string;
  broker: MirAIeBroker;
  status!: DeviceStatus;
  details!: DeviceDetails;
  powerConsumptionDetails!: PowerConsumptionDetails;
  private callbacks: Set<() => void> = new Set();

  constructor(
    id: string,
    name: string,
    friendlyName: string,
    space: Space,
    controlTopic: string,
    statusTopic: string,
    connectionStatusTopic: string,
    broker: MirAIeBroker,
  ) {
    this.id = id;
    this.name = name;
    this.friendlyName = friendlyName;
    this.space = space;
    this.controlTopic = controlTopic;
    this.statusTopic = statusTopic;
    this.connectionStatusTopic = connectionStatusTopic;
    this.broker = broker;

    this.broker.registerDeviceCallback(this.statusTopic, (status) => this.statusHandler(status as DeviceStatusPayload));
    this.broker.registerDeviceCallback(this.connectionStatusTopic, (status) =>
      this.connectionStatusHandler(status as DeviceConnectionPayload),
    );
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      friendlyName: this.friendlyName,
      space: this.space,
      controlTopic: this.controlTopic,
      statusTopic: this.statusTopic,
      connectionStatusTopic: this.connectionStatusTopic,
      status: this.status,
      details: this.details,
      powerConsumptionDetails: this.powerConsumptionDetails,
    };
  }

  static fromJSON(json: DeviceJSON, broker: MirAIeBroker): Device {
    const device = new Device(
      json.id,
      json.name,
      json.friendlyName,
      json.space,
      json.controlTopic,
      json.statusTopic,
      json.connectionStatusTopic,
      broker,
    );
    if (json.status) {
      device.status = new DeviceStatus(
        json.status.isOnline,
        json.status.temperature,
        json.status.roomTemperature,
        json.status.powerMode,
        json.status.fanMode,
        json.status.vSwingMode,
        json.status.hSwingMode,
        json.status.displayMode,
        json.status.hvacMode,
        json.status.presetMode,
        json.status.convertiMode,
        json.status.connectedTime,
        json.status.offTimer,
        json.status.onTimer,
      );
    }
    if (json.details) {
      device.details = new DeviceDetails(
        json.details.modelName,
        json.details.macAddress,
        json.details.category,
        json.details.brand,
        json.details.firmwareVersion,
        json.details.serialNumber,
        json.details.modelNumber,
        json.details.productSerialNumber,
      );
    }
    if (json.powerConsumptionDetails) {
      device.powerConsumptionDetails = new PowerConsumptionDetails(
        json.powerConsumptionDetails.dailyTotal,
        json.powerConsumptionDetails.weeklyTotal,
        json.powerConsumptionDetails.monthlyTotal,
      );
    }
    return device;
  }

  destroy(): void {
    this.broker.removeDeviceCallback(this.statusTopic);
    this.broker.removeDeviceCallback(this.connectionStatusTopic);
  }

  updateDefinition(
    name: string,
    friendlyName: string,
    space: Space,
    controlTopic: string,
    statusTopic: string,
    connectionStatusTopic: string,
  ): void {
    const topicsChanged =
      this.controlTopic !== controlTopic ||
      this.statusTopic !== statusTopic ||
      this.connectionStatusTopic !== connectionStatusTopic;

    if (topicsChanged) {
      this.broker.removeDeviceCallback(this.statusTopic);
      this.broker.removeDeviceCallback(this.connectionStatusTopic);
    }

    this.name = name;
    this.friendlyName = friendlyName;
    this.space = space;
    this.controlTopic = controlTopic;
    this.statusTopic = statusTopic;
    this.connectionStatusTopic = connectionStatusTopic;

    if (topicsChanged) {
      this.broker.registerDeviceCallback(this.statusTopic, (status) =>
        this.statusHandler(status as DeviceStatusPayload),
      );
      this.broker.registerDeviceCallback(this.connectionStatusTopic, (status) =>
        this.connectionStatusHandler(status as DeviceConnectionPayload),
      );
    }
  }

  toString(): string {
    return (
      `Id: ${this.id}\n` +
      `Name: ${this.name}\n` +
      `Friendly name: ${this.friendlyName}\n` +
      `Control topic: ${this.controlTopic}\n` +
      `Status topic: ${this.statusTopic}\n` +
      `Connection status topic: ${this.connectionStatusTopic}\n`
    );
  }

  refresh(): void {
    for (const callback of this.callbacks) {
      callback();
    }
  }

  registerCallback(callback: () => void): void {
    this.callbacks.add(callback);
  }

  removeCallback(callback: () => void): void {
    this.callbacks.delete(callback);
  }

  statusHandler(status: DeviceStatusPayload): void {
    const statusObj = new DeviceStatus(
      status.onlineStatus === "true" || this.status?.isOnline === true,
      toFloat(status.actmp),
      toFloat(status.rmtmp),
      status.ps as PowerMode,
      status.acfs as FanMode,
      status.acvs as SwingMode,
      status.achs as SwingMode,
      status.acdc as DisplayMode,
      status.acmd as HVACMode,
      status.acpm === "on"
        ? PresetMode.BOOST
        : status.acem === "on"
          ? PresetMode.ECO
          : status.acec === "on"
            ? PresetMode.CLEAN
            : PresetMode.NONE,
      (status.cnv || 0) as ConvertiMode,
      status.connectedTime,
      status.actm?.[0] ?? -1,
      status.actm?.[1] ?? -1,
    );

    this.setStatus(statusObj);
    this.refresh();
  }

  connectionStatusHandler(status: DeviceConnectionPayload): void {
    if (!this.status) {
      return;
    }

    this.status.isOnline = status.onlineStatus === "true";
    this.refresh();
  }

  setDetails(details: DeviceDetails): void {
    this.details = details;
  }

  setStatus(status: DeviceStatus): void {
    this.status = status;
  }

  setPowerConsumptionDetails(powerConsumptionDetails: PowerConsumptionDetails): void {
    this.powerConsumptionDetails = powerConsumptionDetails;
  }

  async turnOn(): Promise<void> {
    await this.broker.setPower(this.controlTopic, PowerMode.ON);
  }

  async turnOff(): Promise<void> {
    await this.broker.setPower(this.controlTopic, PowerMode.OFF);
  }

  async setTemperature(temperature: number): Promise<void> {
    await this.broker.setTemperature(this.controlTopic, temperature);
  }

  async setHvacMode(mode: HVACMode): Promise<void> {
    await this.broker.setHvacMode(this.controlTopic, mode);
  }

  async setFanMode(mode: FanMode): Promise<void> {
    await this.broker.setFanMode(this.controlTopic, mode);
  }

  async setPresetMode(mode: PresetMode): Promise<void> {
    await this.broker.setPresetMode(this.controlTopic, mode);
  }

  async setVSwingMode(mode: SwingMode): Promise<void> {
    await this.broker.setVSwingMode(this.controlTopic, mode);
  }

  async setHSwingMode(mode: SwingMode): Promise<void> {
    await this.broker.setHSwingMode(this.controlTopic, mode);
  }

  async setDisplayMode(mode: DisplayMode): Promise<void> {
    await this.broker.setDisplayMode(this.controlTopic, mode);
  }

  async setConvertiMode(mode: ConvertiMode): Promise<void> {
    await this.broker.setConvertiMode(this.controlTopic, mode);
  }

  async setOffTimer(timerValue: number): Promise<void> {
    if (!this.status) throw new Error("Device status is not available yet");
    await this.broker.setOffTimer(this.controlTopic, timerValue, [this.status.offTimer, this.status.onTimer]);
  }

  async setOnTimer(timerValue: number): Promise<void> {
    if (!this.status) throw new Error("Device status is not available yet");
    await this.broker.setOnTimer(this.controlTopic, timerValue, [this.status.offTimer, this.status.onTimer]);
  }
}
