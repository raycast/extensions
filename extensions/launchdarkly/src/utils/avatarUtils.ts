import { LDMaintainer } from "../types";

export const getFullName = (maintainer: LDMaintainer): string => {
  if (maintainer.firstName || maintainer.lastName) {
    return `${maintainer.firstName ?? ""} ${maintainer.lastName ?? ""}`.trim();
  }
  return maintainer.email;
};
