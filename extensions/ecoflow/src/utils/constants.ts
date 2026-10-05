export const ECOFLOW_API_BASE_URL = "https://api.ecoflow.com";

export const API_PATHS = {
  deviceList: "/iot-open/sign/device/list",
  deviceQuotaAll: "/iot-open/sign/device/quota/all",
  deviceQuota: "/iot-open/sign/device/quota",
} as const;

export const REQUEST_TIMEOUT_MS = 15_000;
export const MAX_CONCURRENT_QUOTA_REQUESTS = 3;
