import { ActionPanel, Action, Icon, List, getPreferenceValues, showToast, Toast, Clipboard, open } from "@raycast/api";
import { useState } from "react";
import { useFetch } from "@raycast/utils";

interface Preferences {
  apiKey: string;
}

interface SearchResult {
  id: string;
  text: string;
}

interface SearchResponse {
  results: SearchResult[];
}

interface ComputerInfo {
  oemserial?: string;
  ostype?: string;
  osfamily?: string;
  manufacturer?: string;
  model?: string;
  serviceurl?: string;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const preferences = getPreferenceValues<Preferences>();

  const url = `https://assets.cuit.columbia.edu/dashboard/search.json?term=${encodeURIComponent(
    searchText,
  )}&ptype=maid&noredir=1`;

  const { data, isLoading, error } = useFetch<SearchResponse>(url, {
    headers: {
      Authorization: `Bearer ${preferences.apiKey}`,
      Accept: "application/json",
    },
    execute: searchText.length > 0,
    keepPreviousData: true,
    onError: (error) => {
      console.error(error);
      showToast({
        style: Toast.Style.Failure,
        title: "Search Failed",
        message: "Check your VPN connection to Columbia CUIT.",
      });
    },
  });

  const getIcon = (text: string) => {
    const match = text.match(/([MW])([LD])\d{1,2}$/);
    if (match) {
      const type = match[1];
      if (type === "W") {
        return Icon.Monitor;
      } else if (type === "M") {
        return { source: Icon.Finder };
      }
    }
    return Icon.Computer;
  };

  const decodeId = (hex: string) => {
    try {
      const bytes = [];
      for (let c = 0; c < hex.length; c += 2) {
        bytes.push(parseInt(hex.substring(c, c + 2), 16));
      }
      const decodedString = String.fromCharCode(...bytes);
      const startIndex = decodedString.indexOf("//");
      if (startIndex !== -1) {
        const endIndex = decodedString.indexOf("/", startIndex + 2);
        if (endIndex !== -1) {
          return decodedString.substring(startIndex + 2, endIndex);
        } else {
          return decodedString.substring(startIndex + 2);
        }
      }
    } catch {
      return "";
    }
    return "";
  };

  const fetchComputerInfo = async (id: string): Promise<ComputerInfo | null> => {
    try {
      const response = await fetch(
        `https://assets.cuit.columbia.edu/api/v2/computer/items/0x${id}?fields=oemserial,ostype,osfamily,manufacturer,model,serviceurl`,
        {
          headers: {
            Authorization: `Bearer ${preferences.apiKey}`,
            Accept: "application/json",
          },
        },
      );
      if (!response.ok) throw new Error("Failed to fetch computer info");
      return (await response.json()) as ComputerInfo;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const copyInfo = async (item: SearchResult, type: "full" | "serial" | "name") => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Fetching details..." });
    const info = await fetchComputerInfo(item.id);
    if (!info) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to fetch details";
      return;
    }

    let content = "";
    switch (type) {
      case "full":
        content = `${item.text}\n${info.oemserial ?? ""}\n${info.ostype ?? ""} ${info.osfamily ?? ""}\n${info.model ?? ""}`;
        break;
      case "serial":
        content = info.oemserial ?? "";
        break;
      case "name":
        content = item.text;
        break;
    }

    await Clipboard.copy(content);
    toast.style = Toast.Style.Success;
    toast.title = "Copied to clipboard";
  };

  const results = data?.results ?? [];

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search assets (e.g. 082-jb)..."
      throttle
    >
      {error ? (
        <List.EmptyView
          title="Connection Error"
          description="Make sure you are connected to the CU VPN."
          icon={Icon.Network}
        />
      ) : (
        results.map((item) => {
          const decoded = decodeId(item.id);
          return (
            <List.Item
              key={item.id}
              icon={getIcon(item.text)}
              title={item.text}
              subtitle={decoded}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open Asset Page"
                    url={`https://assets.cuit.columbia.edu/detail/computer/0x${item.id}`}
                  />
                  <Action
                    title="Copy Full Info"
                    icon={Icon.CopyClipboard}
                    onAction={() => copyInfo(item, "full")}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action
                    title="Copy Serial Number"
                    icon={Icon.CopyClipboard}
                    onAction={() => copyInfo(item, "serial")}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                  />
                  <Action
                    title="Copy Asset Name"
                    icon={Icon.CopyClipboard}
                    onAction={() => copyInfo(item, "name")}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                  <Action
                    title="Open Service URL"
                    icon={Icon.Globe}
                    onAction={async () => {
                      const info = await fetchComputerInfo(item.id);
                      if (info?.serviceurl) {
                        await open(info.serviceurl);
                      } else {
                        showToast({ style: Toast.Style.Failure, title: "No Service URL found" });
                      }
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "m" }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
