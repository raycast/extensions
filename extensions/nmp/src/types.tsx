export enum Brand {
  Finn = "Finn",
  Tori = "Tori",
}

export enum Lifecycle {
  prod = "prod",
  dev = "dev",
}

export interface Tool {
  shortName: string;
  displayName: string;
  serviceName: string;
  path: string;
}

export interface Environment {
  brand: Brand;
  domain: string;
  lifecycle: Lifecycle;
  overrides: {
    [shortName: string]: string;
  };
}

export interface Data {
  tools: Tool[];
  environments: Environment[];
}