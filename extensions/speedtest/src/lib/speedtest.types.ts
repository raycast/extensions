export type BaseSpeed = {
  bandwidth: number;
  bytes: number;
  elapsed: number;
  progress?: number;
};

export type Latency = {
  latency: {
    jitter: number;
    high: number;
    low: number;
    iqm: number;
  };
};

export type Speed = BaseSpeed & Latency;

export type SpeedtestResult = {
  isp: string;
  packetLoss: number;
  download: Speed;
  upload: Speed;
  ping: {
    low: number;
    high: number;
    jitter: number;
    latency: number;
    packetLoss: number;
    progress?: number;
  };
  interface: {
    internalIp: string;
    name: string;
    macAddr: string;
    isVpn: false;
    externalIp: string;
    isp?: string;
  };
  server: {
    id: number;
    host: string;
    port: number;
    name: string;
    location: string;
    country: string;
    ip: string;
  };
  result: {
    id: string;
    url: string;
    persisted: boolean;
  };
  error?: string;
};

export type SpeedtestResultResponse = SpeedtestResult & {
  timestamp?: string;
  type?: string;
};

export type ResultNames<T> = {
  [key in keyof T]: T[key] extends object ? ResultNames<T[key]> : string;
};

type AllKeys<T> = T extends object ? { [K in keyof T]: K | AllKeys<T[K]> }[keyof T] : never;
type AllValuesTypes<T> = T extends object ? { [K in keyof T]: T[K] | AllKeys<T[K]> }[keyof T] : never;
type AllObjectValueTypes<T> = {
  [K in keyof T]: T[K] extends object ? T[K] : never;
}[keyof T];

export type SpeedtestResultKeys = Exclude<AllKeys<SpeedtestResult>, undefined>;
export type SpeedtestResultValueType = Exclude<AllValuesTypes<SpeedtestResult>, undefined>;
export type SpeedtestResultObjectValueType = Exclude<AllObjectValueTypes<SpeedtestResult>, undefined>;

export type SpeedTestResultPrettyNames = {
  [key in SpeedtestResultKeys]: string;
};

export type ISPInterface = SpeedtestResult["interface"];
export type Server = SpeedtestResult["server"];
export type Ping = SpeedtestResult["ping"];

export type ClipboardData = SpeedtestResult[keyof SpeedtestResult] | SpeedtestResult;

export interface ResultProgress {
  ping: number | undefined;
  download: number | undefined;
  upload: number | undefined;
}
