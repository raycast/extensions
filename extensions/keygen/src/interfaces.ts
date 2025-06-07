enum LicenseStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  EXPIRING = "EXPIRING",
  EXPIRED = "EXPIRED",
  SUSPENDED = "SUSPENDED",
  BANNED = "BANNED",
}
export interface License {
  id: string;
  attributes: {
    name: string | null;
    key: string;
    expiry: string;
    status: LicenseStatus;
    protected: boolean;
    suspended: boolean;
    maxMachines: number | null;
    maxUsers: number | null;
    maxCores: number | null;
    lastValidated: string | null;
    lastCheckOut: string | null;
    lastCheckIn: string | null;
    nextCheckIn: string | null;
    permissions: string[];
    created: string;
    updated: string;
  };
  relationships: {
    policy: {
      data: {
        type: "policies";
        id: string;
      };
    };
    users: {
      meta: {
        count: number;
      };
    };
    machines: {
      meta: {
        cores: number;
        count: number;
      };
    };
  };
}

enum ExpirationStrategy {
  RESTRICT_ACCESS = "RESTRICT_ACCESS",
  REVOKE_ACCESS = "REVOKE_ACCESS",
  MAINTAIN_ACCESS = "MAINTAIN_ACCESS",
  ALLOW_ACCESS = "ALLOW_ACCESS",
}
enum AuthenticationStrategy {
  TOKEN = "TOKEN",
  LICENSE = "LICENSE",
  MIXED = "MIXED",
  NONE = "NONE",
}
enum ExpirationBasis {
  FROM_CREATION = "FROM_CREATION",
  FROM_FIRST_VALIDATION = "FROM_FIRST_VALIDATION",
  FROM_FIRST_ACTIVATION = "FROM_FIRST_ACTIVATION",
  FROM_FIRST_DOWNLOAD = "FROM_FIRST_DOWNLOAD",
  FROM_FIRST_USE = "FROM_FIRST_USE",
}
enum RenewalBasis {
  FROM_EXPIRY = "FROM_EXPIRY",
  FROM_NOW = "FROM_NOW",
  FROM_NOW_IF_EXPIRED = "FROM_NOW_IF_EXPIRED",
}
enum TransferStrategy {
  RESET_EXPIRY = "RESET_EXPIRY",
  KEEP_EXPIRY = "KEEP_EXPIRY",
}
export interface Policy {
  id: string;
  attributes: {
    name: string;
    duration: number | null;
    floating: boolean;
    maxMachines: number | null;
    expirationStrategy: ExpirationStrategy;
    authenticationStrategy: AuthenticationStrategy;
    expirationBasis: ExpirationBasis;
    renewalBasis: RenewalBasis;
    transferStrategy: TransferStrategy;
    created: string;
    updated: string;
  };
}

export interface Product {
  id: string;
  attributes: {
    name: string;
  };
}

export interface Result<T> {
  data: T;
}
export interface PaginatedResult<T> {
  data: T[];
  links: {
    self: string;
    prev: string | null;
    next: string | null;
    first: string;
    last: string;
    meta: {
      pages: number;
      count: number;
    };
  };
}

interface Error {
  title: string;
  detail: string;
  code?: string;
}
export interface ErrorResult {
  errors: Error[];
}
