import { LDMaintainer } from "../types";

export const getFullName = (maintainer: LDMaintainer): string => {
  if (maintainer.firstName || maintainer.lastName) {
    return `${maintainer.firstName?.charAt(0) ?? ""} ${maintainer.lastName?.charAt(0) ?? ""}`.toUpperCase().trim();
  }
  return maintainer.email.charAt(0).toUpperCase();
};
