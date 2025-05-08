type Row = {
  latency: number;
  unreachable: string | null;
  server: Server;
  region: Region;
};

type Server = {
  name: string;
  hostName: string;
  ipv4: string;
  ipv6: string;
};

type Region = {
  id: number;
  country: string;
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  servers: Server[];
};

type PingResult = {
  latency: number;
  error: string | null;
};

export type { Row, Server, Region, PingResult };
