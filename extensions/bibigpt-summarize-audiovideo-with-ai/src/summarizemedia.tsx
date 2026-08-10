import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Clipboard,
  Detail,
  useNavigation,
  getPreferenceValues,
} from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { useState } from "react";
import fetch from "node-fetch";

interface ApiResponse {
  summary: string;
}

export function SummaryDetail({ summary }: ApiResponse) {
  return <Detail markdown={summary} />;
}

function isValidUrl(url: string): boolean {
  const urlPattern = new RegExp(
    "^(https?:\\/\\/)?" + // protocol
      "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name and extension
      "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
      "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
      "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
      "(\\#[-a-z\\d_]*)?$",
    "i",
  ); // fragment locator
  return urlPattern.test(url);
}

function Command() {
  const [url, setUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { push } = useNavigation();

  async function fetchSummary() {
    if (!url) {
      await showToast(Toast.Style.Failure, "Please enter the URL");
      return;
    }

    if (!isValidUrl(url)) {
      await showToast(Toast.Style.Failure, "Please enter a valid URL");
      return;
    }

    setIsLoading(true);
    await showToast(Toast.Style.Animated, "Summarizing...");
    try {
      const apiTokenUrl = getPreferenceValues().apiTokenUrl;
      const outputLanguage = getPreferenceValues().outputLanguage;
      const response = await fetch(apiTokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: url,
          includeDetail: false,
          promptConfig: {
            outputLanguage: outputLanguage,
          },
        }),
      });

      if (!response.ok) {
        return await showToast(Toast.Style.Failure, "Summary failed!");
      }

      const data = (await response.json()) as ApiResponse;
      push(<SummaryDetail summary={data.summary} />);
      await showToast(Toast.Style.Success, "Summary successful!");
    } catch (error) {
      await showToast(Toast.Style.Failure, "Request failed!", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchCurrentBrowserURL() {
    // 省略具体实现...
    try {
      const script = `tell application "System Events" to set frontApp to name of first process whose frontmost is true    
    if (frontApp starts with "Google Chrome") or (frontApp starts with "Chromium") or (frontApp starts with "Opera") or (frontApp starts with "Vivaldi") or (frontApp starts with "Brave Browser") or (frontApp starts with "Microsoft Edge") then    
      using terms from application "Google Chrome"    
        tell application frontApp to set currentTabUrl to URL of active tab of front window    
      end using terms from    
    else if (frontApp starts with "Arc") then    
      using terms from application "Arc"    
        tell application frontApp to set currentTabURL to URL of active tab of front window    
      end using terms from    
    else if (frontApp starts with "Safari") or (frontApp starts with "Webkit") then    
      using terms from application "Safari"    
        tell application frontApp to set currentTabUrl to URL of front document    
      end using terms from    
    else    
      return "Unsupported browser"    
    end if    
    return currentTabUrl`;
      const currentUrl = await runAppleScript(script);
      if (currentUrl === "Unsupported browser") {
        return showToast(
          Toast.Style.Failure,
          "Browser not supported",
          "Unable to obtain the active window URL of the browser",
        );
      }
      setUrl(currentUrl);
    } catch (error) {
      return showToast(
        Toast.Style.Failure,
        "Unable to obtain browser URL",
        error instanceof Error ? error.message : "",
      );
    }
  }

  async function fetchClipboardURL() {
    const clipboardContent = (await Clipboard.readText()) || "";

    if (isValidUrl(clipboardContent)) {
      setUrl(clipboardContent);
      await showToast(Toast.Style.Success, "URL successfully obtained from clipboard");
    } else {
      await showToast(Toast.Style.Failure, "The content in the clipboard is not a valid URL", clipboardContent);
    }
  }

  return (
    <>
      <Form
        isLoading={isLoading}
        actions={
          <ActionPanel>
            <Action title="Get Summary" onAction={fetchSummary} />
            <Action title="Get URL From Current Browser" onAction={fetchCurrentBrowserURL} />
            <Action title="Get URL From Clipboard" onAction={fetchClipboardURL} />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="url"
          title="Audio and Video URL"
          placeholder="Please enter the audio and video URL to be summarized, press ⌘ + K to view commands"
          value={url}
          onChange={setUrl}
        />
      </Form>
    </>
  );
}

export default Command;
