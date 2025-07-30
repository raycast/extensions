import { Color } from "@raycast/api";
import { LicenseStatus } from "./interfaces";

export const LICENSE_STATUS_COLOR: Record<LicenseStatus, Color> = {
  ACTIVE: Color.Green,
  INACTIVE: Color.Orange,
  EXPIRING: Color.Yellow,
  EXPIRED: Color.Red,
  SUSPENDED: Color.Orange,
  BANNED: Color.Red,
};
