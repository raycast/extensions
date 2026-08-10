export interface ListDevicesResponse {
  body: Body;
  success: boolean;
}
interface Body {
  devices: DevicesItem[];
  activity: Activity;
}
export interface DevicesItem {
  PK: string;
  ts: number;
  name: string;
  stats?: number;
  device_id: string;
  status: number;
  icon?: string;
  learn_ip: number;
  resolvers: Resolvers;
  profile: Profile;
  last_activity?: number;
  legacy_ipv4?: Legacy_ipv4;
  clients?: Clients;
}
interface Resolvers {
  uid: string;
  doh: string;
  dot: string;
  v6: string[];
  v4?: string[];
}
interface Profile {
  PK: string | number;
  updated: number;
  name: string;
}
interface Legacy_ipv4 {
  resolver: string;
  status: number;
}
interface Clients {
  "ipad-pro": {
    ts: number;
  };
  "madeleines-ipad": {
    ts: number;
  };
  xps: Xps;
}
interface Xps {
  ts: number;
}
interface Activity {
  "14hn45rugrd": {
    ts: number;
    clients: any[];
  };
  "1hpl2oa48gr": {
    ts: number;
    clients: any[];
  };
  "1ly2qfd89gf": {
    ts: number;
    clients: any[];
  };
  "1tjpi5nqk8e": {
    ts: number;
    clients: Clients;
  };
  "29kmkxg9pho": {
    ts: number;
    clients: any[];
  };
  "8c5stzd5zt": {
    ts: number;
    clients: any[];
  };
  "8wnd5l3709": {
    ts: number;
    clients: any[];
  };
  yco4g2sq76: Yco4g2sq76;
}
interface Yco4g2sq76 {
  ts: number;
  clients: any[];
}
