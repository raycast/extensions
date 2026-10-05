export type FindMyDevice = {
  id: string;
  name: string;
  displayName?: string;
  deviceClass?: string;
  deviceModel?: string;
  batteryLevel?: number;
  batteryStatus?: string;
  soundAvailable: boolean;
  owner: string;
  ownerId?: string;
  isFamily: boolean;
};

export type BridgeListResponse = {
  ok: true;
  devices: FindMyDevice[];
};

export type BridgeSoundResponse = {
  ok: true;
  deviceId: string;
};

export type BridgeLogoutResponse = {
  ok: true;
  remoteLogoutConfirmed: boolean;
};

export type BridgeErrorCode =
  | "AUTH_REQUIRED"
  | "NO_DEVICES"
  | "DEVICE_NOT_FOUND"
  | "SOUND_UNAVAILABLE"
  | "NETWORK_ERROR"
  | "PYICLOUD_ERROR"
  | "INVALID_REQUEST";

export type BridgeError = {
  ok: false;
  code: BridgeErrorCode;
  message: string;
};

export type LoadState =
  | { kind: "ready"; devices: FindMyDevice[] }
  | { kind: "helper-missing" }
  | { kind: "auth-required"; message: string }
  | { kind: "error"; message: string };
