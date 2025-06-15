export interface GCPServiceInfo {
  name: string;
  displayName: string;
  description: string;
  category: GCPServiceCategory;
  documentation?: string;
  console?: string;
  dependsOn?: string[];
  region?: string;
}

export enum GCPServiceCategory {
  COMPUTE = "Compute",
  STORAGE = "Storage",
  DATABASE = "Database",
  NETWORKING = "Networking",
  SECURITY = "Security",
  ANALYTICS = "Analytics",
  AI_ML = "AI & ML",
  DEVOPS = "DevOps",
  MANAGEMENT = "Management",
  SERVERLESS = "Serverless",
  CONTAINERS = "Containers",
  MIGRATION = "Migration",
  IOT = "IoT",
  MEDIA = "Media",
  HEALTHCARE = "Healthcare",
  FINANCIAL = "Financial",
  OTHER = "Other",
}

export const predefinedServices: Record<string, GCPServiceInfo> = {
  "compute.googleapis.com": {
    name: "compute.googleapis.com",
    displayName: "Compute Engine",
    description: "Create and run virtual machines on Google infrastructure.",
    category: GCPServiceCategory.COMPUTE,
    documentation: "https://cloud.google.com/compute/docs",
    console: "https://console.cloud.google.com/compute",
  },
  "storage.googleapis.com": {
    name: "storage.googleapis.com",
    displayName: "Cloud Storage",
    description: "Object storage for companies of all sizes.",
    category: GCPServiceCategory.STORAGE,
    documentation: "https://cloud.google.com/storage/docs",
    console: "https://console.cloud.google.com/storage",
  },
};

export function getServiceInfo(serviceName: string): GCPServiceInfo {
  const serviceInfo = predefinedServices[serviceName];
  if (serviceInfo) {
    return serviceInfo;
  }

  return {
    name: serviceName,
    displayName: formatServiceName(serviceName),
    description: "Google Cloud Service",
    category: GCPServiceCategory.OTHER,
  };
}

export function formatServiceName(serviceName: string): string {
  if (!serviceName) return "Unknown Service";

  const baseName = serviceName.split(".googleapis.com")[0] || serviceName;
  const parts = baseName.split(".");
  const name = parts[0] || "";

  return name
    .split(/(?=[A-Z])/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function getServicesByCategory(category: GCPServiceCategory): GCPServiceInfo[] {
  return Object.values(predefinedServices).filter((service) => {
    return service.category === category;
  });
}

export function getAllCategories(): GCPServiceCategory[] {
  return Object.values(GCPServiceCategory);
}

export function getAllServices(): GCPServiceInfo[] {
  return Object.values(predefinedServices);
}
