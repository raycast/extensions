export interface PackageType {
  name: string;
}

export interface Version {
  version: string;
  downloads: number;
  "@id": string;
}

export interface NugetPackage {
  "@id": string;
  type: string;
  registration: string;
  id: string;
  version: string;
  description: string;
  summary: string;
  title: string;
  iconUrl: string;
  licenseUrl: string;
  projectUrl: string;
  tags: string[];
  authors: string[];
  owners: string[];
  totalDownloads: number;
  verified: boolean;
  packageTypes: PackageType[];
  versions: Version[];
}
