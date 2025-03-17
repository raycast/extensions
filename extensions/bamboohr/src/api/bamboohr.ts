import { getPreferenceValues } from "@raycast/api";
import { formatDateForAPI, getToday } from "../utils/dateUtils";
import fetch from "node-fetch";

interface Preferences {
  apiKey: string;
  subdomain: string;
}

export interface WhosOutEntry {
  id: string;
  type: string; // General type (Time Off, Holiday)
  timeOffType?: string; // Specific type (Vacation, Sick, etc.)
  employeeId: string;
  name: string;
  start: string;
  end: string;
  status?: string;
  approvalStatus?: string;
  created?: string;
  lastModified?: string;
}

export interface EmployeeInfo {
  id: string;
  [key: string]: string | number | boolean | null | undefined; // More specific than 'any'
}

// Remove the unused DirectoryEntry interface or comment it out if needed for later
// interface DirectoryEntry {
//   id: string;
//   displayName: string;
//   firstName: string;
//   lastName: string;
//   email: string;
//   mobilePhone?: string;
//   workPhone?: string;
// }

export async function getWhosOut(): Promise<WhosOutEntry[]> {
  const { apiKey, subdomain } = getPreferenceValues<Preferences>();

  if (!apiKey || !subdomain) {
    throw new Error("BambooHR API Key and Subdomain are required in extension preferences");
  }

  // Get dates for a wider range (30 days)
  const today = getToday();
  const startDate = formatDateForAPI(today);

  // Create end date 30 days from now
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 30);
  const formattedEndDate = formatDateForAPI(endDate);

  const url = `https://api.bamboohr.com/api/gateway.php/${subdomain}/v1/time_off/whos_out/?start=${startDate}&end=${formattedEndDate}`;

  try {
    // Use the authorization format specified in BambooHR API docs
    const authString = `Basic ${Buffer.from(`${apiKey}:x`).toString("base64")}`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: authString,
      },
    });

    if (!response.ok) {
      let errorDetails = "";
      try {
        const errorText = await response.text();
        errorDetails = ` - ${errorText}`;
      } catch (e) {
        // Ignore error reading response body
      }

      throw new Error(`BambooHR API error: ${response.status} ${response.statusText}${errorDetails}`);
    }

    const data = await response.json();

    // Parse the response data structure
    const entries: WhosOutEntry[] = [];

    // Common patterns in BambooHR API responses
    if (Array.isArray(data)) {
      // Format 1: Direct array of entries
      data.forEach((item) => {
        try {
          processResponseItem(item, entries);
        } catch (e) {
          console.error("Error processing response item:", e);
        }
      });
    } else if (data.item) {
      // Format 2: Object with 'item' array
      const items = Array.isArray(data.item) ? data.item : [data.item];
      items.forEach((item) => {
        try {
          processResponseItem(item, entries);
        } catch (e) {
          console.error("Error processing response item:", e);
        }
      });
    } else if (typeof data === "object") {
      // Format 3: XML converted to JSON format by BambooHR

      // Look for any property that might contain time off data
      Object.keys(data).forEach((key) => {
        const value = data[key];
        if (Array.isArray(value)) {
          value.forEach((item) => {
            try {
              processResponseItem(item, entries);
            } catch (e) {
              console.error("Error processing potential entry:", e);
            }
          });
        }
      });
    }

    // Try to get detailed time off information to enrich our entries
    try {
      // Get dates for a wider range to make sure we catch everything
      const today = getToday();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 15); // Look back 15 days

      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 45); // Look ahead 45 days

      // Fetch detailed time off requests
      const detailedTimeOffUrl = `https://api.bamboohr.com/api/gateway.php/${subdomain}/v1/time_off/requests/?start=${formatDateForAPI(startDate)}&end=${formatDateForAPI(endDate)}`;

      const timeOffResponse = await fetch(detailedTimeOffUrl, {
        headers: {
          Accept: "application/json",
          Authorization: authString,
        },
      });

      if (timeOffResponse.ok) {
        const timeOffData = await timeOffResponse.json();

        // Create a map of employee names to their time off types
        const employeeTimeOffMap = new Map<string, string>();

        if (Array.isArray(timeOffData)) {
          // Process time off requests to extract types by employee name
          timeOffData.forEach((request) => {
            if (request.name && request.status?.status === "approved") {
              const typeName = request.type?.name || "";
              if (typeName) {
                employeeTimeOffMap.set(request.name, typeName);
              }
            }
          });

          // Update our entries with the more accurate time off types
          entries.forEach((entry) => {
            if (employeeTimeOffMap.has(entry.name)) {
              entry.timeOffType = employeeTimeOffMap.get(entry.name);
            }
          });
        }
      }
    } catch (e) {
      console.error("Error fetching detailed time off requests:", e);
      // This is non-fatal, we'll continue with what we have
    }

    return entries;
  } catch (error) {
    console.error("Error fetching who's out data:", error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

// Comment out or remove the unused function
// async function enrichTimeOffTypes(entries: WhosOutEntry[], subdomain: string, authString: string): Promise<void> {
//   // ... existing implementation ...
// }

function processResponseItem(item: Record<string, unknown>, entries: WhosOutEntry[]): void {
  console.log("Processing item:", JSON.stringify(item));

  // For standard timeOff format
  if (item.type === "timeOff" && item.employee) {
    // Try to extract time off type from various possible fields
    let timeOffTypeName = "";

    // Log all potential places where we might find the time off type
    console.log("Debugging time off type fields:");
    console.log("- item.timeOffType:", JSON.stringify(item.timeOffType));
    console.log("- item.type:", JSON.stringify(item.type));
    console.log("- item.request:", item.request ? JSON.stringify(item.request) : "undefined");

    // Check for time off type in all known locations
    if (item.timeOffType && typeof item.timeOffType === "object" && item.timeOffType.name) {
      timeOffTypeName = item.timeOffType.name;
      console.log("Found timeOffType.name:", timeOffTypeName);
    } else if (item.timeOffType && typeof item.timeOffType === "string") {
      timeOffTypeName = item.timeOffType;
      console.log("Found timeOffType string:", timeOffTypeName);
    } else if (item.type && typeof item.type === "object" && item.type.name) {
      timeOffTypeName = item.type.name;
      console.log("Found type.name:", timeOffTypeName);
    } else if (item.request && item.request.type && item.request.type.name) {
      timeOffTypeName = item.request.type.name;
      console.log("Found request.type.name:", timeOffTypeName);
    } else if (item.request && item.request.timeOffType) {
      if (typeof item.request.timeOffType === "object" && item.request.timeOffType.name) {
        timeOffTypeName = item.request.timeOffType.name;
        console.log("Found request.timeOffType.name:", timeOffTypeName);
      } else if (typeof item.request.timeOffType === "string") {
        timeOffTypeName = item.request.timeOffType;
        console.log("Found request.timeOffType string:", timeOffTypeName);
      }
    }

    // Check for standard patterns to guess the type if still empty
    if (!timeOffTypeName) {
      // Look for common time off types in the name or any other fields
      const jsonStr = JSON.stringify(item).toLowerCase();
      if (jsonStr.includes("sick") || jsonStr.includes("medical") || jsonStr.includes("health")) {
        timeOffTypeName = "Sick";
        console.log("Inferred type 'Sick' from item content");
      } else if (jsonStr.includes("vacation") || jsonStr.includes("pto") || jsonStr.includes("holiday")) {
        timeOffTypeName = "Vacation";
        console.log("Inferred type 'Vacation' from item content");
      }
    }

    console.log(`Final extracted time off type: ${timeOffTypeName || "None found"}`);

    entries.push({
      id: item.request?.id || item.id || "",
      type: "Time Off",
      timeOffType: timeOffTypeName || "Paid Time Off",
      employeeId: typeof item.employee === "object" ? item.employee.id : item.employeeId || "",
      name: typeof item.employee === "object" ? item.employee.name : item.name || item.employee || "",
      start: item.start,
      end: item.end,
    });
    return;
  }

  // For holiday format
  if (item.type === "holiday" && item.holiday) {
    entries.push({
      id: item.holiday.id || item.id || "",
      type: "Holiday",
      timeOffType: "Company Holiday",
      employeeId: "0", // Placeholder for holiday
      name: typeof item.holiday === "object" ? item.holiday.name : item.holiday || "",
      start: item.start,
      end: item.end,
    });
    return;
  }

  // For direct employee timeoff format
  if (item.employeeId && item.name && item.start && item.end) {
    entries.push({
      id: item.id || "",
      type: item.type || "Time Off",
      timeOffType: typeof item.timeOffType === "object" ? item.timeOffType.name : item.timeOffType || "Paid Time Off",
      employeeId: item.employeeId,
      name: item.name,
      start: item.start,
      end: item.end,
    });
    return;
  }
}
