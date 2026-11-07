export type Flow = "output" | "input";

export type AudioDevice = {
  id: string;
  name: string;
  volume: number | null;
  muted: boolean | null;
  isDefault: boolean;
  isCommunications: boolean;
};

export type DeviceRole = "playback" | "all" | "communications" | "multimedia" | "console";
