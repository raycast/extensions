import { Icon } from "@raycast/api";

export type AppError = IPValidationError;

export type IPV4 = [number, number, number, number];
export type Mask = number;
export type CIDR = [IPV4, Mask];

export interface IPValidationError {
  kind: "IP_VALIDATION_ERROR";
  msg: string;
}

type panelMapping = {
  itemName: string;
  icon: Icon;
};

export const PANEL_MAPPINGS: Record<string, panelMapping> = {
  range: {
    itemName: "Range",
    icon: Icon.Globe,
  },
  netmask: {
    itemName: "Netmask",
    icon: Icon.Code,
  },
  wildcardBits: {
    itemName: "Wildcard bits",
    icon: Icon.CodeBlock,
  },
  firstIp: {
    itemName: "First ip",
    icon: Icon.ArrowRight,
  },
  firstIpInt: {
    itemName: "First ip (decimal)",
    icon: Icon.ArrowRightCircle,
  },
  lastIp: {
    itemName: "Last ip",
    icon: Icon.ArrowLeft,
  },
  lastIpInt: {
    itemName: "Last ip (decimal)",
    icon: Icon.ArrowLeftCircle,
  },
  totalHost: {
    itemName: "Total host",
    icon: Icon.PlusMinusDivideMultiply,
  },
};
