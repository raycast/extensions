enum LicenseStatus {
  ACTIVE="ACTIVE",
  INACTIVE="INACTIVE",
  EXPIRING="EXPIRING",
  EXPIRED="EXPIRED",
  SUSPENDED="SUSPENDED",
  BANNED="BANNED",
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
  }
  relationships: {
    policy: {
      data: {
        type: "policies";
        id: string;
      }
    }
    users: {
      meta: {
        count: number;
      }
    }
    machines: {
      meta: {
        cores: number;
        count: number;
      }
    }
  }
}

export interface Policy {
  id: string;
  attributes: {
    name: string;
  }
}

export interface Result<T> {
  data: T;
}

interface Error {
  title: string;
  detail: string;
  code?: string;
}
export interface ErrorResult {
  errors: Error[];
}