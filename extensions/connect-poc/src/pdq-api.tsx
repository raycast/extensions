// pdq-api.tsx
import { showToast, Toast } from "@raycast/api";
import axios, { AxiosError } from "axios";
import { getStoredSecret } from "./store-secret";
import { getCachedData, setCachedData } from "./cache";

const BASE_URL = "https://app.pdq.com/v1/api";

export interface Package {
  id: string;
  latestPackageVersionId: string;
  latestVersion: string;
  name: string;
  publisher?: string;
  source?: string;
  packageVersions?: Array<{
    description: string;
  }>;
}

export interface Software {
  hive: string;
  id: string;
  installedAt: string;
  name: string;
  path: string;
  publisher: string;
  uninstall: string;
  version: number[];
  versionRaw: string;
}

export interface Device {
  architecture: string;
  hostname: string;
  id: string;
  insertedAt: string;
  lastUser: string;
  model: string;
  name: string;
  osVersion: string;
  publicIpAddress: string;
  serialNumber: string;
  servicePack: string;
  customFields?: Array<{
    name: string;
    type: string;
    updatedAt: string;
    updatedBy: string;
    value: string | null;
  }>;
  software?: Software[];
}

export interface Group {
  id: string;
  insertedAt: string;
  name: string;
  source: string;
  type: string;
}

interface ApiResponse<T> {
  data: T[];
}

export async function makeApiRequest<T>(
  endpoint: string,
  params: Record<string, string> = {},
  method: "GET" | "POST" = "GET",
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}/${endpoint}`;

  try {
    const token = await getStoredSecret();
    if (!token) {
      throw new Error("API token not found. Please store your PDQ API token first.");
    }

    const config = {
      method,
      url,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      ...(method === "GET" ? { params } : { data: params }),
    };

    const response = await axios(config);

    if (endpoint === "devices" && !Array.isArray(response.data.data)) {
      console.warn("Devices endpoint did not return an array. Attempting to parse...");
      if (typeof response.data === "string") {
        try {
          const parsedData = JSON.parse(response.data);
          return Array.isArray(parsedData) ? { data: parsedData } : { data: [parsedData] };
        } catch (e) {
          console.error("Failed to parse response data:", e);
        }
      }
      return { data: [] };
    }

    return response.data;
  } catch (error) {
    console.error(`Error making request to ${endpoint}:`, error);
    throw error;
  }
}

export async function createDeployment(packageId: string, deviceIds: string[]): Promise<unknown> {
  const endpoint = "deployments";
  const params = {
    package: packageId,
    targets: deviceIds.join(","),
  };
  return makeApiRequest(endpoint, params, "POST");
}

export async function fetchPackageDetails(packageId: string): Promise<Package | null> {
  try {
    const response = await makeApiRequest<{ data: Package }>(`packages/${packageId}`);
    console.log("Package details response:", JSON.stringify(response, null, 2));

    if (response.data && typeof response.data === "object") {
      return response.data;
    } else {
      console.log("Unexpected package details structure:", response);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching package details for ID ${packageId}:`, error);
    throw error;
  }
}

export async function fetchAllDevices(): Promise<Device[]> {
  const cachedDevices = await getCachedData<Device[]>("devices");
  if (cachedDevices) return cachedDevices;

  let allDevices: Device[] = [];
  let currentPage = 1;

  while (true) {
    try {
      const response = await makeApiRequest<Device>("devices", { page: currentPage.toString() });

      if (response.data.length === 0) {
        break;
      }

      allDevices = allDevices.concat(response.data);
      currentPage++;
    } catch (error) {
      console.error(`Error fetching devices on page ${currentPage}:`, error);
      break;
    }
  }

  await setCachedData("devices", allDevices);
  return allDevices;
}

export async function fetchDeviceDetails(deviceId: string): Promise<Device | null> {
  try {
    const response = await makeApiRequest<Device>(`devices/${deviceId}`, { includes: "customFields,software" });

    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      return response.data[0];
    } else if (response.data && typeof response.data === "object") {
      return response.data as Device;
    } else {
      console.log("Unexpected device details structure:", response);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching device details for ID ${deviceId}:`, error);
    throw error;
  }
}

export async function fetchAllPackages(): Promise<Package[]> {
  const cachedPackages = await getCachedData<Package[]>("packages");
  if (cachedPackages) return cachedPackages;

  let allPackages: Package[] = [];
  let currentPage = 1;

  while (true) {
    try {
      const response = await makeApiRequest<Package>("packages", { page: currentPage.toString() });

      if (response.data.length === 0) {
        break;
      }

      allPackages = allPackages.concat(response.data);
      currentPage++;
    } catch (error) {
      console.error(`Error fetching packages on page ${currentPage}:`, error);
      break;
    }
  }

  await setCachedData("packages", allPackages);
  return allPackages;
}

export async function fetchAllGroups(): Promise<Group[]> {
  const cachedGroups = await getCachedData<Group[]>("groups");
  if (cachedGroups) return cachedGroups;

  let allGroups: Group[] = [];
  let currentPage = 1;

  while (true) {
    try {
      const response = await makeApiRequest<Group>("groups", { page: currentPage.toString() });
      console.log(`Groups API response for page ${currentPage}:`, JSON.stringify(response, null, 2));

      if (!response || !Array.isArray(response.data) || response.data.length === 0) {
        break;
      }

      allGroups = allGroups.concat(response.data);
      currentPage++;
    } catch (error) {
      console.error(`Error fetching groups on page ${currentPage}:`, error);
      if (error instanceof AxiosError) {
        console.error("API Error Details:", error.response?.data);
        console.error("API Error Status:", error.response?.status);
        console.error("API Error Headers:", error.response?.headers);
      }
      break;
    }
  }

  console.log(`Total groups fetched: ${allGroups.length}`);
  await setCachedData("groups", allGroups);
  return allGroups;
}
