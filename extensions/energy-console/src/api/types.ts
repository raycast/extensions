export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue;
}

export interface EcoFlowApiResponse<T> {
  code: string | number;
  message?: string;
  data?: T;
  eagleEyeTraceId?: string;
  tid?: string;
}

export interface EcoFlowApiDevice {
  sn: string;
  online: 0 | 1 | number;
  deviceName?: string;
  productName?: string;
}

export interface EcoFlowCredentials {
  accessKey: string;
  secretKey: string;
}
