import { getPreferenceValues } from "@raycast/api";

const API_BASE_URL = "https://hero-sms.com/stubs/handler_api.php";

interface Preferences {
  apiKey: string;
}

function getApiKey(): string {
  const preferences = getPreferenceValues<Preferences>();
  if (!preferences.apiKey) {
    throw new Error("API key not configured. Please set it in Raycast preferences.");
  }
  return preferences.apiKey;
}

async function apiCall(action: string, params: Record<string, string | number | boolean> = {}): Promise<unknown> {
  const apiKey = getApiKey();

  // Build query string manually to avoid URLSearchParams type issues
  const queryParams: string[] = [`action=${encodeURIComponent(action)}`, `api_key=${encodeURIComponent(apiKey)}`];

  for (const [key, value] of Object.entries(params)) {
    queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }

  const url = `${API_BASE_URL}?${queryParams.join("&")}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();

    // Check for common error responses
    if (text.startsWith("NO_KEY") || text.startsWith("BAD_KEY")) {
      throw new Error("Invalid API key. Please check your API key in Raycast preferences.");
    }
    if (text.startsWith("ERROR_SQL")) {
      throw new Error("Server error. Please try again later.");
    }

    // Try to parse as JSON, fall back to string
    try {
      const parsed = JSON.parse(text);

      // Check for error status in JSON response
      if (parsed && typeof parsed === "object" && parsed.status === "error") {
        throw new Error(parsed.error || parsed.msg || "API returned an error");
      }

      return parsed;
    } catch {
      // If it's not JSON and looks like an error string, throw it
      if (text.startsWith("BAD_") || text.startsWith("NO_") || text.startsWith("ERROR_")) {
        throw new Error(text);
      }
      return text;
    }
  } catch (error) {
    // Re-throw known errors, wrap others
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Network error: ${String(error)}`);
  }
}

export interface Service {
  code: string;
  name: string;
}

export interface Country {
  id: number;
  rus: string;
  eng: string;
  chn: string;
  visible: number;
  retry: number;
}

export interface PriceInfo {
  cost: number;
  count: number;
  physicalCount: number;
}

export interface Activation {
  activationId: string;
  serviceCode: string;
  phoneNumber: string;
  activationCost: number;
  activationStatus: string;
  smsCode: string | null;
  smsText: string | null;
  activationTime: string;
  discount: string;
  repeated: string;
  countryCode: string;
  countryName: string;
  canGetAnotherSms: string;
  currency: string;
}

export interface GetNumberResponse {
  activationId: number;
  phoneNumber: string;
  activationCost: number;
  currency: number;
  countryCode: string;
  canGetAnotherSms: string;
  activationTime: string;
  activationOperator?: string;
}

export async function getServicesList(country?: number, lang: string = "en"): Promise<Service[]> {
  const params: Record<string, string | number> = { lang };
  if (country !== undefined) {
    params.country = country;
  }

  const result = await apiCall("getServicesList", params);

  if (typeof result === "string") {
    throw new Error(result);
  }

  if (result.status === "success" && Array.isArray(result.services)) {
    return result.services;
  }

  throw new Error("Failed to fetch services list");
}

export async function getCountries(): Promise<Country[]> {
  const result = await apiCall("getCountries");

  if (typeof result === "string") {
    // Check if it's an error string
    if (result.startsWith("NO_KEY") || result.startsWith("BAD_KEY")) {
      throw new Error("Invalid API key. Please check your API key in Raycast preferences.");
    }
    if (result.startsWith("ERROR_")) {
      throw new Error(`API error: ${result}`);
    }
    throw new Error(result);
  }

  // API returns countries as an object with country IDs as keys: {"1": {...}, "2": {...}}
  if (result && typeof result === "object" && !Array.isArray(result)) {
    // Convert object to array by extracting values
    return Object.values(result) as Country[];
  }

  if (Array.isArray(result)) {
    return result;
  }

  throw new Error(`Failed to fetch countries: unexpected response format. Received: ${typeof result}`);
}

export async function getPrices(
  service?: string,
  country?: number,
): Promise<Record<string, Record<string, PriceInfo>>> {
  const params: Record<string, string | number> = {};
  if (service) params.service = service;
  if (country !== undefined) params.country = country;

  const result = await apiCall("getPrices", params);

  if (typeof result === "string") {
    throw new Error(result);
  }

  // The API can return either:
  // 1. An array: [{countryId: {serviceCode: {...}}}, ...]
  // 2. An object directly: {countryId: {serviceCode: {...}}}

  if (Array.isArray(result)) {
    // If array, merge all objects into one
    if (result.length === 0) {
      return {};
    }
    // Merge all array items into a single object
    return Object.assign({}, ...result);
  }

  // If it's already an object, return it
  if (typeof result === "object" && result !== null) {
    return result;
  }

  console.error("Unexpected getPrices response format:", JSON.stringify(result));
  throw new Error(`Failed to fetch prices: unexpected response format`);
}

export async function getNumber(
  service: string,
  country: number,
  operator?: string,
  maxPrice?: number,
  ref?: string,
): Promise<GetNumberResponse | string> {
  const params: Record<string, string | number> = { service, country };
  if (operator) params.operator = operator;
  if (maxPrice !== undefined) params.maxPrice = maxPrice;
  if (ref) params.ref = ref;

  const result = await apiCall("getNumberV2", params);

  // Handle error responses
  if (typeof result === "string") {
    if (result.startsWith("ACCESS_NUMBER:")) {
      // Old format, parse it
      const parts = result.split(":");
      return {
        activationId: parseInt(parts[1]),
        phoneNumber: parts[2],
        activationCost: 0,
        currency: 840,
        countryCode: String(country),
        canGetAnotherSms: "1",
        activationTime: new Date().toISOString(),
      };
    }
    throw new Error(result);
  }

  return result;
}

export async function getActiveActivations(start: number = 0, limit: number = 100): Promise<Activation[]> {
  const result = await apiCall("getActiveActivations", { start, limit });

  if (typeof result === "string") {
    // Handle error strings
    if (result === "NO_ACTIVATIONS" || result.includes("NO_ACTIVATIONS")) {
      return [];
    }
    throw new Error(result);
  }

  // Expected format: {status: "success", activeActivations: {...rows: [...]}}
  // The API returns activeActivations as an object with a 'rows' property containing the array
  if (result && typeof result === "object") {
    // Handle standard format: {status: "success", activeActivations: {rows: [...]}}
    if (result.status === "success" && result.activeActivations) {
      // activeActivations is an object with a 'rows' array
      if (Array.isArray(result.activeActivations.rows)) {
        // Map the rows to match the Activation interface
        return result.activeActivations.rows.map((row: Record<string, unknown>) => ({
          activationId: String(row.id || row.activationId || ""),
          serviceCode: row.service || row.serviceCode || "",
          phoneNumber: row.phone || row.phoneNumber || "",
          activationCost: parseFloat(row.cost || row.activationCost || 0),
          activationStatus: String(row.status || row.activationStatus || ""),
          smsCode: row.code || row.smsCode || null,
          smsText: row.text || row.smsText || null,
          activationTime: row.createDate || row.activationTime || "",
          discount: row.discount || "0.00",
          repeated: row.repeated || "0",
          countryCode: String(row.country || row.countryCode || ""),
          countryName: row.countryName || "",
          canGetAnotherSms: row.canGetAnotherSms || "0",
          currency: String(row.currency || "840"),
        })) as Activation[];
      }

      // Fallback: if activeActivations is directly an array
      if (Array.isArray(result.activeActivations)) {
        return result.activeActivations;
      }
    }

    // Handle error status
    if (result.status === "error") {
      if (result.error === "NO_ACTIVATIONS") {
        return [];
      }
      throw new Error(result.error || "API returned an error");
    }

    // If result is an array directly
    if (Array.isArray(result)) {
      return result;
    }

    // Handle object format (similar to countries): {activationId: {...}, ...}
    // Check if it looks like an object with activation IDs as keys
    const keys = Object.keys(result);
    if (keys.length > 0 && keys.every((key) => /^\d+$/.test(key))) {
      // Convert object to array
      return Object.values(result) as Activation[];
    }
  }

  // If we get here, the response format is unexpected - log it for debugging
  const errorMsg = `Failed to fetch active activations: unexpected response format. Type: ${typeof result}`;
  console.error("getActiveActivations unexpected response:", JSON.stringify(result).substring(0, 500));
  throw new Error(errorMsg);
}

export async function getStatus(activationId: number): Promise<string> {
  const result = await apiCall("getStatus", { id: activationId });

  if (typeof result === "string") {
    return result;
  }

  throw new Error("Failed to fetch activation status");
}

export async function getStatusV2(activationId: number): Promise<{
  verificationType: number;
  sms?: {
    dateTime: string;
    code: string;
    text: string;
  };
  call?: {
    from: string;
    text: string;
    code: string;
    dateTime: string;
    url: string;
    parsingCount: number;
  };
}> {
  const result = await apiCall("getStatusV2", { id: activationId });

  if (typeof result === "string") {
    if (result === "STATUS_CANCEL" || result === "NO_ACTIVATION") {
      throw new Error(result);
    }
    throw new Error(result);
  }

  return result;
}

export async function setActivationStatus(activationId: number, status: 1 | 3 | 6 | 8): Promise<string> {
  const result = await apiCall("setStatus", { id: activationId, status });

  if (typeof result === "string") {
    // Check for error responses
    if (result.startsWith("EARLY_CANCEL_DENIED")) {
      throw new Error("You can't cancel a number within the first 2 minutes");
    }
    if (result.startsWith("NO_ACTIVATION")) {
      throw new Error("Activation ID doesn't exist");
    }
    if (result.startsWith("BAD_STATUS")) {
      throw new Error("Invalid status");
    }
    if (result.startsWith("WRONG_ACTIVATION_ID")) {
      throw new Error("Activation ID is incorrect");
    }
    // Success responses: ACCESS_CANCEL, ACCESS_READY, etc.
    return result;
  }

  throw new Error("Failed to set activation status");
}

export async function getBalance(): Promise<string> {
  const result = await apiCall("getBalance");

  if (typeof result === "string") {
    return result;
  }

  throw new Error("Failed to fetch balance");
}
