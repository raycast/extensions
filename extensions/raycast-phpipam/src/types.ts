/**
 * phpIPAM returns most database values as strings and the exact shape of an
 * object depends on the endpoint (search results are untransformed, direct
 * reads have addresses converted to dotted notation). Keep everything lenient.
 */
export type Scalar = string | number | null | undefined;

export interface Section {
  id: Scalar;
  name: Scalar;
  description: Scalar;
  masterSection?: Scalar;
  [key: string]: unknown;
}

export interface SubnetUsage {
  max_hosts?: Scalar;
  Used?: Scalar;
  Used_percent?: Scalar;
  Reserved?: Scalar;
  Reserved_percent?: Scalar;
  freehosts?: Scalar;
  freehosts_percent?: Scalar;
  [key: string]: unknown;
}

export interface Subnet {
  id: Scalar;
  subnet: Scalar;
  mask: Scalar;
  sectionId: Scalar;
  masterSubnetId?: Scalar;
  description?: Scalar;
  isFolder?: Scalar;
  isFull?: Scalar;
  vlanId?: Scalar;
  vrfId?: Scalar;
  gatewayId?: Scalar;
  usage?: SubnetUsage;
  [key: string]: unknown;
}

export interface IpAddress {
  id: Scalar;
  subnetId: Scalar;
  /** Dotted notation when present. */
  ip?: Scalar;
  /** Decimal in search results, dotted on transformed endpoints. */
  ip_addr?: Scalar;
  hostname?: Scalar;
  mac?: Scalar;
  owner?: Scalar;
  description?: Scalar;
  note?: Scalar;
  port?: Scalar;
  switch?: Scalar;
  /** ipTag id: 1 Offline, 2 Used, 3 Reserved, 4 DHCP. */
  state?: Scalar;
  lastSeen?: Scalar;
  [key: string]: unknown;
}

export interface Vlan {
  vlanId: Scalar;
  name: Scalar;
  number: Scalar;
  description: Scalar;
  [key: string]: unknown;
}

export interface Vrf {
  vrfId: Scalar;
  name: Scalar;
  rd: Scalar;
  description: Scalar;
  [key: string]: unknown;
}

export interface SearchResults {
  subnets: Subnet[];
  addresses: IpAddress[];
  vlans: Vlan[];
  vrfs: Vrf[];
}
