// src/types.ts

export interface AuthDto {
  username: string;
  password: string;
  otp?: string;
}

export interface HomebridgeNetworkInterfacesDto {
  adapters: string[];
}

export interface HomebridgeMdnsSettingDto {
  advertiser: string;
}

export interface AccessorySetCharacteristicDto {
  characteristicType: string;
  value: string | boolean | number;
}

export interface UserDto {
  id: number;
  name: string;
  username: string;
  admin: boolean;
  password?: string;
  otpActive: boolean;
}

export interface UserUpdatePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface UserActivateOtpDto {
  code: string;
}

export interface UserDeactivateOtpDto {
  password: string;
}

export interface HbServiceStartupSettings {
  HOMEBRIDGE_DEBUG: boolean;
  HOMEBRIDGE_KEEP_ORPHANS: boolean;
  HOMEBRIDGE_INSECURE: boolean;
  ENV_DEBUG?: string;
  ENV_NODE_OPTIONS?: string;
}

export interface Accessory {
  aid: number;
  iid: number;
  uuid: string;
  type: string;
  humanType: string;
  serviceName: string;
  serviceCharacteristics: Characteristic[];
  accessoryInformation: AccessoryInformation;
  values: Record<string, string | boolean | number>;
  instance: Instance;
  uniqueId: string;
}

export interface Characteristic {
  aid: number;
  iid: number;
  uuid: string;
  type: string;
  serviceType: string;
  serviceName: string;
  description: string;
  value: string | boolean | number;
  format: string;
  perms: string[];
  unit?: string;
  maxValue?: number;
  minValue?: number;
  minStep?: number;
  canRead: boolean;
  canWrite: boolean;
  ev: boolean;
}

export interface AccessoryInformation {
  Manufacturer: string;
  Model: string;
  Name: string;
  "Serial Number": string;
  "Firmware Revision": string;
}

export interface Instance {
  name: string;
  username: string;
  ipAddress: string;
  port: number;
  services: Service[];
  connectionFailedCount: number;
}

export interface Service {
  name: string;
  serviceName: string;
  characteristics: Characteristic[];
}

export interface Preferences {
  url: string;
  username: string;
  password: string;
}

export interface CustomError {
  message: string;
  code?: number;
  response?: {
    status: number;
  };
  stack?: string;
}

export interface LoginResponse {
  access_token: string;
  expires_in: number;
}
