import {
  Detail,
  getPreferenceValues,
  showToast,
  Toast,
  Color,
  Icon,
  Form,
  ActionPanel,
  Action,
  LocalStorage,
} from "@raycast/api";
import { useEffect, useState } from "react";
import * as http from "http";
import * as https from "https";

interface Preferences {
  fritzboxUrl?: string;
  timeout?: string;
}

const DEFAULT_FRITZBOX_URL = "http://192.168.178.1:49000";
const DEFAULT_TIMEOUT = 5000;

type Status = "idle" | "connecting" | "success" | "error";

interface ResetState {
  status: Status;
  message: string;
  details: string[];
  attemptedPaths: string[];
  ipBefore?: string;
  ipAfter?: string;
}

/**
 * Fetches the current public IP address from api.ipify.org (much faster)
 */
async function getCurrentIP(): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeoutMs = 3000;
    const timer = setTimeout(() => {
      reject(new Error("IP fetch timeout"));
    }, timeoutMs);

    https
      .get("https://api.ipify.org", (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          clearTimeout(timer);
          const ip = data.trim();
          if (ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
            resolve(ip);
          } else {
            reject(new Error("Invalid IP address format"));
          }
        });
      })
      .on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Masks IP address to show only the last octet
 * Example: 123.456.789.123 -> xxx.xxx.xxx.123
 */
function maskIP(ip: string): string {
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `xxx.xxx.xxx.${parts[3]}`;
  }
  return ip;
}

async function resetFritzBoxIP(onProgress: (update: Partial<ResetState>) => void, customUrl?: string): Promise<void> {
  const preferences = getPreferenceValues<Preferences>();
  let fritzboxUrl = preferences.fritzboxUrl || DEFAULT_FRITZBOX_URL;

  // Use custom URL from setup if provided
  if (customUrl) {
    fritzboxUrl = customUrl;
  } else {
    // Check LocalStorage for stored URL
    const storedUrl = await LocalStorage.getItem<string>("fritzbox-url");
    if (storedUrl) {
      fritzboxUrl = storedUrl;
    }
  }

  const timeout = parseInt(preferences.timeout || String(DEFAULT_TIMEOUT), 10);

  // Get IP before reset
  onProgress({
    status: "connecting",
    message: "Checking current IP address...",
    details: [`Target: ${fritzboxUrl}`, `Fetching current IP...`],
  });

  let ipBefore = "Unknown";
  let maskedIPBefore = "Fetching...";
  try {
    ipBefore = await getCurrentIP();
    maskedIPBefore = maskIP(ipBefore);
  } catch {
    maskedIPBefore = "Failed to fetch";
  }

  onProgress({
    status: "connecting",
    message: "Testing Fritz!Box connectivity...",
    details: [`Target: ${fritzboxUrl}`, `Current IP: ${maskedIPBefore}`, `Timeout: ${timeout}ms`],
    ipBefore: maskedIPBefore,
  });

  onProgress({
    status: "connecting",
    message: "Preparing SOAP request...",
    details: [`Target: ${fritzboxUrl}`, `Current IP: ${maskedIPBefore}`, `Timeout: ${timeout}ms`],
    ipBefore: maskedIPBefore,
  });

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
<s:Body><u:ForceTermination xmlns:u="urn:schemas-upnp-org:service:WANIPConnection:1" /></s:Body>
</s:Envelope>`;

  const urlPaths = ["igd", ""];
  const attemptedPaths: string[] = [];

  for (const path of urlPaths) {
    const url = `${fritzboxUrl}/${path}upnp/control/WANIPConn1`;
    attemptedPaths.push(url);

    onProgress({
      message: `Attempting connection via ${path || "default"} path...`,
      details: [
        `Target: ${fritzboxUrl}`,
        `Timeout: ${timeout}ms`,
        `Current URL: ${url}`,
        `Attempt ${attemptedPaths.length} of ${urlPaths.length}`,
      ],
      attemptedPaths,
    });

    try {
      onProgress({
        message: `Sending ForceTermination request to ${path || "default"} path...`,
      });

      const statusCode = await Promise.race([
        new Promise<number>((resolve, reject) => {
          const parsedUrl = new URL(url);
          const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 49000,
            path: parsedUrl.pathname,
            method: "POST",
            headers: {
              "Content-Type": 'text/xml; charset="utf-8"',
              "Content-Length": Buffer.byteLength(soapBody),
              SOAPACTION: '"urn:schemas-upnp-org:service:WANIPConnection:1#ForceTermination"',
            },
          };

          const req = http.request(options, (res) => {
            res.on("data", () => {
              // Consume data but don't store it
            });
            res.on("end", () => {
              resolve(res.statusCode || 0);
            });
            res.on("error", (err) => {
              reject(err);
            });
          });

          req.on("error", (err: NodeJS.ErrnoException) => {
            // ECONNRESET might actually mean the request was processed
            // Fritz!Box might just be rudely closing the connection
            if (err.code === "ECONNRESET") {
              resolve(200); // Assume success
            } else {
              reject(err);
            }
          });

          req.write(soapBody);
          req.end();
        }),
        new Promise<number>((_, reject) =>
          setTimeout(() => reject(new Error(`Request timeout after ${timeout}ms`)), timeout),
        ),
      ]);

      if (statusCode >= 200 && statusCode < 300) {
        onProgress({
          status: "connecting",
          message: "Resetting connection...",
          details: [
            `Target: ${fritzboxUrl}`,
            `Successful path: ${url}`,
            `Response status: ${statusCode}`,
            `IP Before: ${maskedIPBefore}`,
            ``,
            `Fritz!Box is reconnecting...`,
            `Waiting for connection to stabilize...`,
          ],
          attemptedPaths,
          ipBefore: maskedIPBefore,
        });

        // Wait a bit for the connection to reset (5 seconds should be enough)
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // Get IP after reset with retry logic
        let ipAfter = "Unknown";
        let maskedIPAfter = "Fetching...";

        onProgress({
          status: "connecting",
          message: "Checking new IP address...",
          details: [
            `Target: ${fritzboxUrl}`,
            `Successful path: ${url}`,
            `Response status: ${statusCode}`,
            `IP Before: ${maskedIPBefore}`,
            ``,
            `Connection reset complete.`,
            `Fetching new IP address...`,
          ],
          attemptedPaths,
          ipBefore: maskedIPBefore,
          ipAfter: "Fetching...",
        });

        // Try to fetch new IP with retries (network might still be resetting)
        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            ipAfter = await getCurrentIP();
            maskedIPAfter = maskIP(ipAfter);
            break; // Success, exit retry loop
          } catch {
            if (attempt < maxRetries) {
              await new Promise((resolve) => setTimeout(resolve, 2000));
            } else {
              maskedIPAfter = "Failed to fetch";
            }
          }
        }

        onProgress({
          status: "success",
          message: "IP Reset Successful!",
          details: [
            `Target: ${fritzboxUrl}`,
            `Successful path: ${url}`,
            `Response status: ${statusCode}`,
            ``,
            `**IP Before:** ${maskedIPBefore}`,
            `**IP After:** ${maskedIPAfter}`,
            ``,
            ipAfter !== ipBefore && ipAfter !== "Unknown"
              ? `✅ IP address changed successfully!`
              : `⚠️ IP address may still be updating...`,
          ],
          attemptedPaths,
          ipBefore: maskedIPBefore,
          ipAfter: maskedIPAfter,
        });

        await showToast({
          style: Toast.Style.Success,
          title: "IP Reset Successful",
          message: `${maskedIPBefore} → ${maskedIPAfter}`,
        });
        return;
      } else {
        onProgress({
          message: `Path ${path || "default"} returned status ${statusCode}, trying next...`,
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      const errorCode = error instanceof Error ? (error as NodeJS.ErrnoException).code : "N/A";
      const errorName = error instanceof Error ? error.name : "N/A";

      if (path === urlPaths[urlPaths.length - 1]) {
        throw error;
      }

      onProgress({
        message: `Path ${path || "default"} failed (${errorMsg}), trying next...`,
        details: [
          `Target: ${fritzboxUrl}`,
          `Timeout: ${timeout}ms`,
          `Last error: ${errorMsg}`,
          `Error code: ${errorCode}`,
          `Error type: ${errorName}`,
          `Attempts: ${attemptedPaths.length} of ${urlPaths.length}`,
        ],
      });
    }
  }

  throw new Error(
    `Failed to connect to Fritz!Box at ${fritzboxUrl}. Please check:\n` +
      "1. Fritz!Box URL is correct\n" +
      "2. You are connected to the Fritz!Box network\n" +
      "3. UPnP is enabled on your Fritz!Box",
  );
}

function SetupForm({ onSubmit }: { onSubmit: (url: string) => void }) {
  const [url, setUrl] = useState(DEFAULT_FRITZBOX_URL);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save and Continue"
            onSubmit={async (values: { fritzboxUrl: string }) => {
              await LocalStorage.setItem("fritzbox-url-configured", "true");
              await LocalStorage.setItem("fritzbox-url", values.fritzboxUrl);
              onSubmit(values.fritzboxUrl);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Fritz!Box Setup"
        text="Enter your Fritz!Box URL to get started. You can change this later in extension preferences."
      />
      <Form.TextField
        id="fritzboxUrl"
        title="Fritz!Box URL"
        placeholder="http://192.168.178.1:49000"
        value={url}
        onChange={setUrl}
        info="The URL of your Fritz!Box router (usually http://192.168.178.1:49000 or http://fritz.box:49000)"
      />
      <Form.Description text="Common Fritz!Box URLs:" />
      <Form.Description text="• http://192.168.178.1:49000 (default IP)" />
      <Form.Description text="• http://fritz.box:49000 (hostname)" />
    </Form>
  );
}

export default function Command() {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [configuredUrl, setConfiguredUrl] = useState<string | null>(null);
  const [state, setState] = useState<ResetState>({
    status: "idle",
    message: "Initializing...",
    details: [],
    attemptedPaths: [],
  });

  useEffect(() => {
    async function checkConfiguration() {
      const configured = await LocalStorage.getItem<string>("fritzbox-url-configured");
      setIsConfigured(configured === "true");
    }
    checkConfiguration();
  }, []);

  useEffect(() => {
    if (isConfigured === true) {
      async function performReset() {
        try {
          await resetFritzBoxIP((update) => {
            setState((prev) => ({ ...prev, ...update }));
          }, configuredUrl || undefined);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
          const errorCode = error instanceof Error ? (error as NodeJS.ErrnoException).code : "N/A";
          const errorType = error instanceof Error ? error.name : "N/A";

          setState((prev) => ({
            ...prev,
            status: "error",
            message: "IP Reset Failed",
            details: [
              `**Error:** ${errorMessage}`,
              `**Error Code:** ${errorCode}`,
              `**Error Type:** ${errorType}`,
              ``,
              `**Troubleshooting:**`,
              `• Verify Fritz!Box URL is correct (currently: ${prev.attemptedPaths[0] ? new URL(prev.attemptedPaths[0]).origin : "N/A"})`,
              `• Ensure you're connected to Fritz!Box network`,
              `• Check that UPnP is enabled on Fritz!Box`,
              `• Try accessing your Fritz!Box in your browser`,
              ``,
              `**Attempted paths:**`,
              ...prev.attemptedPaths.map((p) => `  - ${p}`),
            ],
          }));

          await showToast({
            style: Toast.Style.Failure,
            title: "IP Reset Failed",
            message: errorMessage,
          });
        }
      }

      performReset();
    }
  }, [isConfigured, configuredUrl]);

  const getStatusIcon = () => {
    switch (state.status) {
      case "connecting":
        return Icon.CircleProgress;
      case "success":
        return Icon.CheckCircle;
      case "error":
        return Icon.XMarkCircle;
      default:
        return Icon.Circle;
    }
  };

  const getStatusColor = () => {
    switch (state.status) {
      case "connecting":
        return Color.Blue;
      case "success":
        return Color.Green;
      case "error":
        return Color.Red;
      default:
        return Color.SecondaryText;
    }
  };

  // Show setup form on first run
  if (isConfigured === false) {
    return (
      <SetupForm
        onSubmit={(url) => {
          setConfiguredUrl(url);
          setIsConfigured(true);
        }}
      />
    );
  }

  // Show loading while checking configuration
  if (isConfigured === null) {
    return <Detail isLoading={true} markdown="Checking configuration..." />;
  }

  const markdown = `
# ${state.message}

${state.details.map((detail) => detail).join("\n\n")}

---

**Status**: ${state.status.toUpperCase()}
  `;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text={state.status.toUpperCase()}
            icon={{ source: getStatusIcon(), tintColor: getStatusColor() }}
          />
          {state.ipBefore && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="IP Before" text={state.ipBefore} icon={Icon.Globe} />
            </>
          )}
          {state.ipAfter && <Detail.Metadata.Label title="IP After" text={state.ipAfter} icon={Icon.CheckCircle} />}
          {state.attemptedPaths.length > 0 && <Detail.Metadata.Separator />}
          {state.attemptedPaths.length > 0 && (
            <Detail.Metadata.Label title="Attempts" text={String(state.attemptedPaths.length)} />
          )}
        </Detail.Metadata>
      }
    />
  );
}
