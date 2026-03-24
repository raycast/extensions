import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
  Color,
} from "@raycast/api";
import { useState } from "react";
import { fetchServerStatus, ServerStatus } from "./utils";
import { Server } from "./types";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [checkedIp, setCheckedIp] = useState("");

  async function checkServer(ipInput: string) {
    if (!ipInput) return;
    setIsLoading(true);
    setCheckedIp(ipInput);
    setStatus(null);

    // Quick parse for port (e.g. mc.hypixel.net:25565)
    let ip = ipInput;
    let port = 25565; // Default Java port
    let explicitPort = false;

    // Remove http/https if present
    ip = ip.replace(/^https?:\/\//, "");

    if (ip.includes(":")) {
      const parts = ip.split(":");
      ip = parts[0];
      const parsedPort = parseInt(parts[1]);
      if (!isNaN(parsedPort)) {
        port = parsedPort;
        explicitPort = true;
      }
    }

    // Heuristic: If port is 19132, start with Bedrock. Otherwise Java.
    // If not explicit port, default is 25565 (Java).
    const type: "java" | "bedrock" = port === 19132 ? "bedrock" : "java";

    // Attempt 1
    let tempServer: Server = {
      id: "temp",
      name: "Temp",
      ip: ip,
      port: port,
      type: type,
      createdAt: 0,
    };

    try {
      let result = await fetchServerStatus(tempServer);

      // Attempt 2: If offline, try the other protocol
      if (!result.online) {
        const otherType = type === "java" ? "bedrock" : "java";
        // If the port was NOT explicit, we might want to swap the port too?
        // - If user typed "example.com", we tried 25565/Java. Failed.
        // - Should we try 19132/Bedrock? Yes.
        // - If user typed "example.com:25565", we tried 25565/Java. Failed.
        // - Should we try 25565/Bedrock? Yes (some bedrock servers run on non-standard ports).

        let otherPort = port;
        if (!explicitPort && otherType === "bedrock") {
          otherPort = 19132;
        } else if (!explicitPort && otherType === "java") {
          otherPort = 25565;
        }

        tempServer = { ...tempServer, type: otherType, port: otherPort };
        const secondResult = await fetchServerStatus(tempServer);

        if (secondResult.online) {
          result = secondResult;
        }
      }

      setStatus(result);
    } catch {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to check status",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // If we have a result, show it
  if (status) {
    let icon: { source: Icon | string; tintColor?: Color | null | undefined } =
      status.online
        ? { source: Icon.CheckCircle, tintColor: Color.Green }
        : { source: Icon.XMarkCircle, tintColor: Color.Red };
    if (status.icon) {
      icon = { source: status.icon, tintColor: undefined };
    }

    /* Large hero image, name, and clean MOTD */
    const heroImage = status?.icon
      ? `![Likely Server Icon](${status.icon})`
      : "";
    const markdown = `
${heroImage}

# ${checkedIp}

${
  status?.online
    ? `
${status.motd}
`
    : `
_Server is currently offline or unreachable._
`
}
`;

    return (
      <List
        isShowingDetail={true}
        searchBarPlaceholder="Enter another IP..."
        onSearchTextChange={(text) => {
          if (text !== searchText) {
            setStatus(null); // Reset when typing new search
            setSearchText(text);
          }
        }}
      >
        <List.Item
          title={checkedIp}
          icon={icon}
          detail={
            <List.Item.Detail
              markdown={markdown}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Address"
                    text={checkedIp}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Status"
                    text={status.online ? "Online" : "Offline"}
                    icon={
                      status.online
                        ? { source: Icon.CircleFilled, tintColor: Color.Green }
                        : { source: Icon.Circle, tintColor: Color.Red }
                    }
                  />
                  {status.online && (
                    <>
                      <List.Item.Detail.Metadata.Label
                        title="Version"
                        text={status.version}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Latency"
                        text={`${status.latency}ms`}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Players"
                        text={`${status.players?.online} / ${status.players?.max}`}
                      />
                    </>
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Check Again"
                onAction={() => checkServer(checkedIp)}
              />
              <Action
                title="Check New Server"
                onAction={() => {
                  setStatus(null);
                  setSearchText("");
                }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter Server IP (e.g. mc.hypixel.net)"
      isLoading={isLoading}
      throttle
    >
      {searchText.length > 0 ? (
        <List.Item
          title={`Check Status for: ${searchText}`}
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <Action
                title="Check Server"
                onAction={() => checkServer(searchText)}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Enter an IP to check"
        />
      )}
    </List>
  );
}
