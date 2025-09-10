/* eslint-disable @typescript-eslint/no-explicit-any */

export type Platform = "iOS" | "macOS" | "watchOS" | "tvOS" | "visionOS" | "Unknown";

export type ProfileType = "Development" | "Ad Hoc" | "App Store" | "Enterprise" | "Unknown";

export interface ProvisioningProfile {
  AppIDName: string;
  ApplicationIdentifierPrefix: string[];
  CreationDate: Date;
  Platform: Platform[];
  DeveloperCertificates: DeveloperCertificate[];
  Entitlements: Entitlements;
  ExpirationDate: Date;
  Name: string;
  ProvisionedDevices?: string[];
  TeamIdentifier: string[];
  TeamName: string;
  TimeToLive: number;
  UUID: string;
  Version: number;
  Type: ProfileType;
  filePath: string;
}

export interface DeveloperCertificate {
  encoded: Buffer;
  serialNumber: string;
  subject: {
    commonName: string;
    organizationName: string;
    organizationalUnitName: string;
  };
  issuer: {
    commonName: string;
  };
  validity: {
    notBefore: Date;
    notAfter: Date;
  };
}

export interface Entitlements {
  [key: string]: any;
}
