export type ApiTokenResource = {
  id: string;
  name: string;
  created_at: string;
};
export type AccessTokenResource = {
  token: ApiTokenResource;
  access_token: string;
  token_type: string;
};

type ShortRoleResource = {
  id: number;
  name: string;
};
export type UserResource = {
  id: number;
  email: string;
  roles: ShortRoleResource[];
  language: {
    id: number;
    name: string;
    icon: {
      url: string;
    };
  };
};

export type Project = {
  id: number;
  name: string;
  description: string;
  members: number;
  servers: number;
  is_default: boolean;
};

type IPv4AddressResource = {
  ip: string;
  is_primary: boolean;
};
type IPv6AddressResource = {
  primary_ip: string;
  is_primary: boolean;
};
export type Server = {
  id: number;
  name: string;
  description: string;
  settings: {
    os_image: {
      icon: string;
      name: string;
    };
  };
  status: "started" | "stopped" | "stopping" | "starting" | "restarting";
  real_status: "started" | "stopped";
  ip_addresses: {
    ipv4: IPv4AddressResource[];
    ipv6: IPv6AddressResource[];
  };
  location: {
    icon: {
      name: string;
      url: string;
    };
  };
};

export type ISOImageResource = {
  id: number;
  name: string;
  visibility: "public" | "private";
  os_type: "Linux" | "Windows";
  iso_url: string;
  size: number;
};

export type Member = {
  id: number;
  email: string;
  is_owner: boolean;
  status: string;
  user_id: number;
  invite_sent_at: string | null;
};
