import { Icon } from "@raycast/api";

export type AppError = IPValidationError | RangeConvertError;

export type IPV4 = [number, number, number, number];
export type Mask = number;
export type CIDR = [IPV4, Mask];

export interface IPValidationError {
  kind: "IP_VALIDATION_ERROR";
  msg: string;
}

export interface RangeConvertError {
  kind: "IP_RANGE_FAILED_TO_CIDR_ERROR";
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
    itemName: "Wildcard Bits",
    icon: Icon.CodeBlock,
  },
  firstIp: {
    itemName: "First IP",
    icon: Icon.ArrowRight,
  },
  firstIpInt: {
    itemName: "First IP (Decimal)",
    icon: Icon.ArrowRightCircle,
  },
  lastIp: {
    itemName: "Last IP",
    icon: Icon.ArrowLeft,
  },
  lastIpInt: {
    itemName: "Last IP (Decimal)",
    icon: Icon.ArrowLeftCircle,
  },
  totalHost: {
    itemName: "Total Host",
    icon: Icon.PlusMinusDivideMultiply,
  },
};
