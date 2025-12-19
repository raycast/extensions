export interface Root {
  rdapConformance: string[];
  lang: string;
  objectClassName: string;
  handle: string;
  ldhName: string;
  nameservers: Nameserver[];
  secureDNS: SecureDns;
  entities: Entity[];
  status: string[];
  port43: string;
  events: Event[];
  notices: Notice[];
  links: Link4[];
}

export interface Nameserver {
  objectClassName: string;
  ldhName: string;
  handle: string;
  links: Link[];
}

export interface Link {
  title: string;
  rel: string;
  type: string;
  value: string;
  href: string;
}

export interface SecureDns {
  delegationSigned: boolean;
}

export interface Entity {
  objectClassName: string;
  handle: string;
  roles: string[];
  vcardArray: [string, [string, VcardArray, string, string][]];
  links: Link2[];
  entities: Entity2[];
  publicIds: PublicId[];
}

export interface VcardArray {
  [key: string]: unknown;
}

export interface Link2 {
  title: string;
  rel: string;
  type?: string;
  value: string;
  href: string;
}

export interface Entity2 {
  objectClassName: string;
  handle: string;
  roles: string[];
  vcardArray: [string, [string, VcardArray2, string, string][]];
}

export interface VcardArray2 {
  type?: string;
}

export interface PublicId {
  type: string;
  identifier: string;
}

export interface Event {
  eventAction: string;
  eventDate: string;
}

export interface Notice {
  title: string;
  description: string[];
  links: Link3[];
}

export interface Link3 {
  title: string;
  rel: string;
  value: string;
  href: string;
}

export interface Link4 {
  title: string;
  rel: string;
  type: string;
  value: string;
  href: string;
}
