import { Detail, ActionPanel, Action, getPreferenceValues, showToast, Toast, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface Preferences {
  googleCloudApiKey: string;
  model?: string;
  googleSearchEngineId?: string;
  googleMapsPlatformApiKey?: string;
}

interface HealthStatus {
  service: string;
  status: "checking" | "success" | "error";
  message?: string;
  details?: unknown;
}

export default function HealthCheck() {
  const preferences = getPreferenceValues<Preferences>();
  const [logs, setLogs] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<HealthStatus[]>([
    { service: "Google Cloud API Key", status: "checking" },
    { service: "Gemini AI", status: "checking" },
    { service: "Maps Static API", status: "checking" },
    { service: "Places API", status: "checking" },
    { service: "Custom Search API", status: "checking" },
    { service: "Location Services", status: "checking" },
  ]);

  useEffect(() => {
    checkAllServices();
  }, []);

  function addLog(message: string) {
    const timestamp = new Date().toISOString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  }

  async function updateStatus(service: string, status: "success" | "error", message?: string, details?: unknown) {
    addLog(`${service}: ${status} - ${message || "No message"}`);
    setStatuses((prev) => prev.map((s) => (s.service === service ? { ...s, status, message, details } : s)));
  }

  async function checkAllServices() {
    addLog("Starting health check...");
    // 1. Check API Key
    if (!preferences.googleCloudApiKey) {
      updateStatus("Google Cloud API Key", "error", "No API key configured");
    } else {
      updateStatus("Google Cloud API Key", "success", "API key is configured");
    }

    // 2. Test Gemini AI
    if (preferences.googleCloudApiKey) {
      try {
        const genAI = new GoogleGenerativeAI(preferences.googleCloudApiKey);
        const model = genAI.getGenerativeModel({
          model: preferences.model || "gemini-2.0-flash-exp",
        });

        const result = await model.generateContent("Say 'API test successful' and nothing else.");
        const response = await result.response.text();

        updateStatus(
          "Gemini AI",
          "success",
          `Model: ${preferences.model || "gemini-2.0-flash-exp"}`,
          `Response: ${response.substring(0, 50)}...`,
        );
      } catch (error) {
        updateStatus("Gemini AI", "error", (error as Error).message || "Failed to connect", error);
      }
    }

    // 3. Test Maps Static API
    if (preferences.googleCloudApiKey) {
      try {
        const testAddress = "1600 Pennsylvania Avenue, Washington DC";
        const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(testAddress)}&zoom=16&size=200x200&key=${preferences.googleCloudApiKey}`;

        const response = await fetch(mapUrl, { method: "HEAD" });
        if (response.ok) {
          updateStatus("Maps Static API", "success", "Maps API is working");
        } else {
          updateStatus("Maps Static API", "error", `HTTP ${response.status}`, await response.text());
        }
      } catch (error) {
        updateStatus("Maps Static API", "error", "Failed to connect", error);
      }
    }

    // 4. Test Places API
    if (preferences.googleMapsPlatformApiKey) {
      try {
        const testQuery = "1600 Pennsylvania Avenue";
        const placesUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(testQuery)}&types=address&key=${preferences.googleMapsPlatformApiKey}`;

        const response = await fetch(placesUrl);
        const data = (await response.json()) as { status?: string; predictions?: unknown[]; error_message?: string };

        if (response.ok && data.status === "OK") {
          updateStatus(
            "Places API",
            "success",
            `Places API is working`,
            `Found ${data.predictions?.length || 0} predictions for test query`,
          );
        } else if (data.error_message) {
          updateStatus("Places API", "error", data.error_message, data);
        } else if (data.status === "ZERO_RESULTS") {
          updateStatus("Places API", "success", "API working (no results for test)");
        } else {
          updateStatus("Places API", "error", `Status: ${data.status}`);
        }
      } catch (error) {
        updateStatus("Places API", "error", "Failed to connect", error);
      }
    } else if (!preferences.googleMapsPlatformApiKey) {
      updateStatus("Places API", "error", "No Maps Platform API key configured");
    }

    // 5. Test Custom Search API
    if (preferences.googleCloudApiKey && preferences.googleSearchEngineId) {
      try {
        const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${preferences.googleCloudApiKey}&cx=${preferences.googleSearchEngineId}&q=test&num=1`;
        const response = await fetch(searchUrl);
        const data = (await response.json()) as {
          items?: unknown[];
          error?: { message?: string };
          searchInformation?: { totalResults?: string };
        };

        if (response.ok && data.items) {
          updateStatus(
            "Custom Search API",
            "success",
            `Search Engine ID configured`,
            `Found ${data.searchInformation?.totalResults || 0} results`,
          );
        } else if (data.error) {
          updateStatus("Custom Search API", "error", data.error.message, data.error);
        } else {
          updateStatus("Custom Search API", "error", "Unknown error");
        }
      } catch (error) {
        updateStatus("Custom Search API", "error", "Failed to connect", error);
      }
    } else if (!preferences.googleSearchEngineId) {
      updateStatus("Custom Search API", "error", "No Search Engine ID configured");
    }

    // 6. Test Location Services
    try {
      addLog("Testing location services...");

      // Try multiple services
      const services = [
        { name: "ipapi.co", url: "https://ipapi.co/json/" },
        { name: "ip-api.com", url: "http://ip-api.com/json/" },
        { name: "geolocation-db.com", url: "https://geolocation-db.com/json/" },
      ];

      let locationFound = false;
      for (const service of services) {
        if (locationFound) break;

        try {
          addLog(`Trying ${service.name}...`);
          const response = await fetch(service.url);
          addLog(`${service.name} response status: ${response.status}`);

          if (response.ok) {
            const data = (await response.json()) as {
              city?: string;
              city_name?: string;
              region?: string;
              regionName?: string;
              state?: string;
              latitude?: number;
              lat?: number;
              longitude?: number;
              lon?: number;
            };
            addLog(`${service.name} data: ${JSON.stringify(data).substring(0, 200)}...`);

            const city = data.city || data.city_name;
            const region = data.region || data.regionName || data.state;

            if (city && region) {
              updateStatus(
                "Location Services",
                "success",
                `${city}, ${region}`,
                `Service: ${service.name}, Lat: ${data.latitude || data.lat}, Lon: ${data.longitude || data.lon}`,
              );
              locationFound = true;
            }
          }
        } catch (err) {
          addLog(`${service.name} failed: ${(err as Error).message}`);
        }
      }

      if (!locationFound) {
        updateStatus("Location Services", "error", "All location services failed");
      }
    } catch (error) {
      addLog(`Location service error: ${(error as Error).message}`);
      updateStatus("Location Services", "error", "Location service unavailable", (error as Error).message);
    }

    // Show completion toast
    addLog("Health check completed");
    const hasErrors = statuses.some((s) => s.status === "error");
    await showToast({
      style: hasErrors ? Toast.Style.Failure : Toast.Style.Success,
      title: hasErrors ? "Health Check Complete - Issues Found" : "Health Check Complete - All Good!",
      message: hasErrors ? "Some services have issues" : "All services are operational",
    });
  }

  const getStatusIcon = (status: "checking" | "success" | "error") => {
    switch (status) {
      case "checking":
        return "⏳";
      case "success":
        return "✅";
      case "error":
        return "❌";
    }
  };

  // const getStatusColor = (status: "checking" | "success" | "error") => {
  //   switch (status) {
  //     case "checking":
  //       return "gray";
  //     case "success":
  //       return "green";
  //     case "error":
  //       return "red";
  //   }
  // };

  const allChecked = statuses.every((s) => s.status !== "checking");
  const hasErrors = statuses.some((s) => s.status === "error");

  const markdown = `
# Google AI Search - Health Check

${statuses
  .map(
    (s) => `
## ${getStatusIcon(s.status)} ${s.service}
**Status**: ${s.status === "checking" ? "Checking..." : s.status.toUpperCase()}
${s.message ? `**Message**: ${s.message}` : ""}
${s.details ? `**Details**: ${typeof s.details === "string" ? s.details : "`" + JSON.stringify(s.details, null, 2) + "`"}` : ""}
`,
  )
  .join("\n")}

---

${
  allChecked
    ? hasErrors
      ? "⚠️ **Some services have issues.** Check the error messages above."
      : "✅ **All services are operational!**"
    : "⏳ **Checking services...**"
}
`;

  return (
    <Detail
      navigationTitle="API Health Check"
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="API Key" text={preferences.googleCloudApiKey ? "Configured" : "Missing"} />
          <Detail.Metadata.Label title="Model" text={preferences.model || "gemini-2.0-flash-exp"} />
          <Detail.Metadata.Label title="Search Engine ID" text={preferences.googleSearchEngineId || "Not configured"} />
          <Detail.Metadata.Label
            title="Maps Platform API Key"
            text={preferences.googleMapsPlatformApiKey ? "Configured" : "Not configured"}
          />
          <Detail.Metadata.Separator />
          {statuses.map((s) => (
            <Detail.Metadata.Label
              key={s.service}
              title={s.service}
              text={s.status === "checking" ? "Checking..." : s.status}
            />
          ))}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Run Health Check Again"
            icon={Icon.ArrowClockwise}
            onAction={() => {
              setLogs([]);
              setStatuses(statuses.map((s) => ({ ...s, status: "checking" })));
              checkAllServices();
            }}
          />
          <Action.CopyToClipboard
            title="Copy Diagnostic Logs"
            content={`# Google AI Search Health Check Logs\n\nPreferences:\n- API Key: ${preferences.googleCloudApiKey ? "Set" : "Missing"}\n- Model: ${preferences.model || "gemini-2.0-flash-exp"}\n- Search Engine ID: ${preferences.googleSearchEngineId || "Not set"}\n- Maps Platform API Key: ${preferences.googleMapsPlatformApiKey ? "Set" : "Not set"}\n\nStatus:\n${statuses.map((s) => `- ${s.service}: ${s.status} - ${s.message || "No message"}`).join("\n")}\n\nDetailed Logs:\n${logs.join("\n")}`}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.OpenInBrowser title="Google Cloud Console" url="https://console.cloud.google.com/apis/dashboard" />
          <Action.OpenInBrowser title="Create Search Engine" url="https://programmablesearchengine.google.com/" />
        </ActionPanel>
      }
    />
  );
}
