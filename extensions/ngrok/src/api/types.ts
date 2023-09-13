export type Tunnel = {
  id: string;
  public_url: string;
  started_at: string;
  proto: string;
  region: string;
  tunnel_session: {
    id: string;
    uri: string;
  };
  endpoint: {
    id: string;
    uri: string;
  };
  forwards_to: string;
  metadata: string;
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
