import { showToast, Toast, showHUD } from "@raycast/api";
import { getApiKey } from "./utils/api-key";

interface ApiTestResponse {
  username: string;
  role: string;
}

export default async function testApiKey() {
  try {
    const apiKey = await getApiKey();

    if (!apiKey) {
      await showToast({
        style: Toast.Style.Failure,
        title: "API Key Required",
        message: "Please set your Pain.is API key using the 'Set API Key' command first",
      });
      return;
    }

    await showToast({
      style: Toast.Style.Animated,
      title: "Testing API Key",
      message: "Verifying your Pain.is API key...",
    });

    const testResult = await fetch("https://api.pain.is/v1/account", {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!testResult.ok) {
      const errorText = await testResult.text();

      if (testResult.status === 401) {
        await showToast({
          style: Toast.Style.Failure,
          title: "API Key Invalid",
          message: "Authentication failed. Please check your API key.",
        });
      } else if (testResult.status === 403) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Access Forbidden",
          message: "Your account may be banned or inactive.",
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "API Test Failed",
          message: `HTTP ${testResult.status}: ${errorText}`,
        });
      }
      return;
    }

    const result = (await testResult.json()) as ApiTestResponse;

    await showHUD(`API Key Valid! Connected as: ${result.username} (${result.role})`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Test Failed",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}
