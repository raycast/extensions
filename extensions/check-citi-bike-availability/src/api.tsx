import axios from "axios";

// Define interfaces for API responses
interface StationStatus {
  station_id: string;
  num_bikes_available: number;
  num_ebikes_available: number;
  num_docks_available: number;
  is_renting: number;
  last_reported: number;
}

interface StationInfo {
  station_id: string;
  name: string;
}

// Axios instance configuration
const axiosInstance = axios.create({
  baseURL: "https://gbfs.citibikenyc.com/gbfs/en/",
  timeout: 10000, // 10 seconds timeout
});

const STATUS_URL = "station_status.json";
const INFO_URL = "station_information.json";

// Function to fetch station status
export async function getStationStatus(): Promise<StationStatus[]> {
  try {
    const response = await axiosInstance.get(STATUS_URL);
    if (response.data && response.data.data && response.data.data.stations) {
      return response.data.data.stations as StationStatus[];
    } else {
      throw new Error("Invalid response structure for station status.");
    }
  } catch (error: unknown) {
    handleAxiosError(error, "Could not fetch station status.");
  }
}

// Function to fetch station information
export async function getStationInformation(): Promise<StationInfo[]> {
  try {
    const response = await axiosInstance.get(INFO_URL);
    if (response.data && response.data.data && response.data.data.stations) {
      return response.data.data.stations as StationInfo[];
    } else {
      throw new Error("Invalid response structure for station information.");
    }
  } catch (error: unknown) {
    handleAxiosError(error, "Could not fetch station information.");
  }
}

// Helper function to handle Axios errors
function handleAxiosError(error: unknown, defaultMessage: string): never {
  if (axios.isAxiosError(error)) {
    console.error("Axios error:", error.message);
    if (!error.response) {
      // Network or DNS error
      throw new Error("Network error: Please check your internet connection.");
    } else {
      console.error("Response error data:", error.response.data);
      console.error("Response error status:", error.response.status);
      console.error("Response error headers:", error.response.headers);
      throw new Error(error.message || defaultMessage);
    }
  } else if (error instanceof Error) {
    console.error("General error:", error.message);
    throw new Error(error.message || defaultMessage);
  } else {
    console.error("Unknown error:", error);
    throw new Error(defaultMessage);
  }
}
