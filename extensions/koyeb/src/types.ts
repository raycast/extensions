export type Activity = {
  id: string;
  actor: {
    name: string;
    type: string;
  };
  object: {
    id: string;
    name: string;
    type: string;
    metadata?: {
      app_name?: string;
      definition?: {
        name: string;
      };
    };
  };
  verb: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any;
  created_at: string;
};

export type App = {
  id: string;
  name: string;
  domains: Domain[];
};

export enum DomainStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  ERROR = "ERROR",
  DELETING = "DELETING",
  DELETED = "DELETED",
}
export enum DomainType {
  AUTOASSIGNED = "AUTOASSIGNED",
  CUSTOM = "CUSTOM",
}
export type Domain = {
  id: string;
  name: string;
  status: DomainStatus;
  type: DomainType;
  updated_at: string;
};
export type CreateDomain = {
  name: string;
  type: string;
  app_id: string;
};

export enum SecretType {
  SIMPLE = "SIMPLE",
  REGISTRY = "REGISTRY",
  MANAGED = "MANAGED",
}
export type Secret = {
  id: string;
  name: string;
  type: SecretType;
  updated_at: string;
  value: string;
};
export type CreateSecret = {
  name: string;
  value: string;
  type: SecretType;
};

export enum ServiceType {
  INVALID_TYPE = "INVALID_TYPE",
  WEB = "WEB",
  WORKER = "WORKER",
  DATABASE = "DATABASE",
}
export type Service = {
  id: string;
  name: string;
  type: ServiceType;
  app_id: string;
};

export type ErrorResult = {
  status: number;
  code: string;
  message: string;
  fields?: Array<{ field: string; description: string }>;
};
