export type LocalTunnel = {
  name: string;
  ID: string;
  uri: string;
  public_url: string;
  proto: string;
  config: {
    addr: string;
    inspect: boolean;
  };
};

export type TunnelSession = {
  agent_version: string;
  id: string;
  ip: string;
  os: string;
  region: string;
  started_at: string;
  transport: string;
  uri: string;
};

export type Tunnel = {
  id: string;
  started_at: string;
  region: string;
  tunnel_session: {
    id: string;
    uri: string;
  };
  forwards_to: string;
  metadata: string;
  labels?: Record<string, string>;
  public_url?: string;
  proto?: string;
  endpoint?: {
    id: string;
    uri: string;
  };
};

export type ReservedDomain = {
  id: string;
  uri: string;
  created_at: string;
  description: string;
  domain: string;
};

export type NgrokError = {
  error_code: string;
  status_code: number;
  msg: string;
  details: {
    operation_id: string;
  };
};
