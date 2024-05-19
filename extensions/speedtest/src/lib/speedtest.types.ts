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

export type ISPInterface = SpeedtestResult["interface"];
export type Server = SpeedtestResult["server"];
export type Ping = SpeedtestResult["ping"];

export type ClipboardData = SpeedtestResult[keyof SpeedtestResult] | SpeedtestResult;

export interface ResultProgress {
  ping: number | undefined;
  download: number | undefined;
  upload: number | undefined;
}
