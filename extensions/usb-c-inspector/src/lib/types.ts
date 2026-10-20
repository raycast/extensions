/** Top-level payload from `whatcable --json`. */
export interface WhatCableOutput {
  version?: string;
  isDesktopMac?: boolean;
  ports: Port[];
  builtInUSBDevices?: {
    devices: USBDevice[];
  };
  otherUSBDevices?: {
    behindPort?: string;
    devices: USBDevice[];
  };
}

export interface Port {
  name: string;
  type?: string | null;
  className?: string;
  connectionActive: boolean;
  pdCapable?: boolean;
  status: string;
  headline: string;
  subtitle: string;
  bullets: string[];
  cable?: Cable | null;
  device?: PartnerDevice | null;
  trust?: Trust | null;
  charging?: Charging | null;
  dataLink?: DataLink | null;
  displays?: DisplayInfo[] | null;
  devices?: USBDevice[] | null;
  transports?: {
    supported?: string[];
    active?: string[];
    provisioned?: string[];
    displayPortLanes?: string | null;
    usb3Speed?: string | null;
  };
}

export interface Cable {
  endpoint?: string;
  vendorID?: number;
  vendorName?: string | null;
  curatedBrands?: string[] | null;
  speed?: string | null;
  currentRating?: string | null;
  maxVolts?: number | null;
  maxWatts?: number | null;
  type?: string | null;
  trustFlags?: TrustFlag[] | null;
  certID?: string | null;
  certification?: {
    listings?: { company: string; model: string; status: string; date: string }[];
    vendorMatch?: boolean;
  } | null;
}

export interface TrustFlag {
  code: string;
  title: string;
  detail: string;
  severity: string;
}

export interface Trust {
  tier: string;
  confirmedBy?: string[] | null;
  contradiction?: boolean;
}

export interface PartnerDevice {
  kind?: string | null;
  vendorID?: number;
  vendorName?: string | null;
  productID?: number;
  pdRevision?: string | null;
}

export interface Charging {
  summary: string;
  detail: string;
  bottleneck: string;
  isWarning: boolean;
}

export interface DataLink {
  summary: string;
  detail: string;
  bottleneck: string;
  isWarning: boolean;
  cableSignalConflict?: boolean;
}

export interface DisplayInfo {
  summary: string;
  detail: string;
  bottleneck: string;
  isWarning: boolean;
  monitorName?: string | null;
}

export interface USBDevice {
  name?: string | null;
  vendorID: number;
  productID: number;
  vendorName?: string | null;
  serialNumber?: string | null;
  usbVersion?: string | null;
  speed: string;
  locationID: string;
  children?: USBDevice[] | null;
}
