import { LocalStorage } from "@raycast/api";

export interface PinnedPackage {
  id: string;
  name: string;
  title: string;
  version: string;
  description: string;
  canonical: string;
  url: string;
  publisher?: string;
  author?: string;
  fhirMajorVersion: number[];
}

export interface PinnedResource {
  id: string; // resourceId + packageId for uniqueness
  packageId: string;
  resourceId: number;
  title: string;
  canonical: string;
  resourceType: string;
  packageName: string;
  simplifierUrl: string;
  jsonUrl: string;
}

const PINNED_PACKAGES_KEY = "fhir-pinned-packages";
const PINNED_RESOURCES_KEY = "fhir-pinned-resources";

export const CORE_PACKAGES: PinnedPackage[] = [
  {
    id: "hl7.fhir.r5.core|5.0.0",
    name: "hl7.fhir.r5.core",
    title: "FHIR R5 Core",
    version: "5.0.0",
    description: "FHIR R5 Core specification",
    canonical: "http://hl7.org/fhir",
    url: "http://hl7.org/fhir/R5/",
    publisher: "HL7 International",
    fhirMajorVersion: [5],
  },
  {
    id: "hl7.fhir.r4.core|4.0.1",
    name: "hl7.fhir.r4.core",
    title: "FHIR R4 Core",
    version: "4.0.1",
    description: "FHIR R4 Core specification",
    canonical: "http://hl7.org/fhir",
    url: "http://hl7.org/fhir/R4/",
    publisher: "HL7 International",
    fhirMajorVersion: [4],
  },
];

// Pinned Packages Functions
export async function getPinnedPackages(): Promise<PinnedPackage[]> {
  const stored = await LocalStorage.getItem<string>(PINNED_PACKAGES_KEY);
  if (!stored) {
    return [];
  }

  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to parse pinned packages:", error);
    return [];
  }
}

export async function setPinnedPackages(packages: PinnedPackage[]): Promise<void> {
  await LocalStorage.setItem(PINNED_PACKAGES_KEY, JSON.stringify(packages));
}

// Pinned Resources Functions
export async function getPinnedResources(): Promise<PinnedResource[]> {
  const stored = await LocalStorage.getItem<string>(PINNED_RESOURCES_KEY);
  if (!stored) {
    return [];
  }

  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to parse pinned resources:", error);
    return [];
  }
}

export async function setPinnedResources(resources: PinnedResource[]): Promise<void> {
  await LocalStorage.setItem(PINNED_RESOURCES_KEY, JSON.stringify(resources));
}

// Pin/Unpin Package Functions
export async function pinPackage(packageData: PinnedPackage): Promise<void> {
  // Prevent core packages from being pinned
  if (isCorePackage(packageData.id)) {
    throw new Error("Cannot pin core packages");
  }

  const packages = await getPinnedPackages();

  // Check if package already pinned
  const existingIndex = packages.findIndex((p) => p.id === packageData.id);
  if (existingIndex !== -1) {
    return; // Already pinned
  }

  const newPackage: PinnedPackage = {
    ...packageData,
  };

  packages.push(newPackage);
  await setPinnedPackages(packages);
}

export function getCorePackages(): PinnedPackage[] {
  return CORE_PACKAGES;
}

export function isCorePackage(packageId: string): boolean {
  return CORE_PACKAGES.some((pkg) => pkg.id === packageId);
}

export async function unpinPackage(packageId: string): Promise<void> {
  const packages = await getPinnedPackages();
  const filtered = packages.filter((p) => p.id !== packageId);
  await setPinnedPackages(filtered);
}

export async function isPackagePinned(packageId: string): Promise<boolean> {
  const packages = await getPinnedPackages();
  return packages.some((p) => p.id === packageId);
}

// Pin/Unpin Resource Functions
export async function pinResource(resourceData: PinnedResource): Promise<void> {
  const resources = await getPinnedResources();

  // Check if resource already pinned
  const existingIndex = resources.findIndex((r) => r.id === resourceData.id);
  if (existingIndex !== -1) {
    return; // Already pinned
  }

  const newResource: PinnedResource = {
    ...resourceData,
  };

  resources.push(newResource);
  await setPinnedResources(resources);
}

export async function unpinResource(resourceId: string): Promise<void> {
  const resources = await getPinnedResources();
  const filtered = resources.filter((r) => r.id !== resourceId);
  await setPinnedResources(filtered);
}

export async function isResourcePinned(resourceId: string): Promise<boolean> {
  const resources = await getPinnedResources();
  return resources.some((r) => r.id === resourceId);
}

export async function initializePinnedPackages(): Promise<void> {
  // Core packages are handled separately - no need to initialize anything
  return;
}

export async function getPinnedPackageById(packageId: string): Promise<PinnedPackage | undefined> {
  const packages = await getPinnedPackages();
  return packages.find((p) => p.id === packageId);
}
