interface WakeData {
  mac: string;
  ip: string;
  name: string;
  port: string;
}

interface PingJob {
  ip: string;
  index: number;
  previousSameIpIndex?: number | undefined;
}

export type { WakeData, PingJob };
