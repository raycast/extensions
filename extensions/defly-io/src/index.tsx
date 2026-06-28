import { useFetch } from "@raycast/utils";
import { useState, useEffect } from "react";
import { ActionPanel, List, Action, showToast, Toast, Icon, LaunchProps, LocalStorage } from "@raycast/api";

type Team = {
  mapPercent: number;
  maxSize: number;
  available: boolean;
  players: [
    {
      ID: number;
      name: string;
      skin: number;
      badge: number;
    }
  ];
  team: {
    color: string;
    hex: string;
    ID: number;
  };
};

const regions = [
  {
    name: "US East",
    id: "use",
    ports: [
      {
        name: "3005 (Teams)",
        value: "3005",
      },
      {
        name: "3015 (Teams)",
        value: "3015",
      },
      {
        name: "3025 (Teams)",
        value: "3025",
      },
      {
        name: "3035 (Teams)",
        value: "3035",
      },
      {
        name: "3045 (Teams)",
        value: "3045",
      },
      {
        name: "3002 (Defuse)",
        value: "3002",
      },
      {
        name: "3012 (Defuse)",
        value: "3012",
      },
      {
        name: "3022 (Defuse)",
        value: "3022",
      },
      {
        name: "3032 (Defuse)",
        value: "3032",
      },
      {
        name: "3042 (Defuse)",
        value: "3042",
      },
    ],
  },
  {
    name: "US West",
    id: "usw",
    ports: [
      {
        name: "3005 (Teams)",
        value: "3005",
      },
      {
        name: "3015 (Teams)",
        value: "3015",
      },
      {
        name: "3025 (Teams)",
        value: "3025",
      },
      {
        name: "3002 (Defuse)",
        value: "3002",
      },
      {
        name: "3012 (Defuse)",
        value: "3012",
      },
      {
        name: "3022 (Defuse)",
        value: "3022",
      },
    ],
  },
  {
    name: "Europe",
    id: "eu",
    ports: [
      {
        name: "3005 (Teams)",
        value: "3005",
      },
      {
        name: "3015 (Teams)",
        value: "3015",
      },
      {
        name: "3002 (Defuse)",
        value: "3002",
      },
      {
        name: "3012 (Defuse)",
        value: "3012",
      },
      {
        name: "3022 (Defuse)",
        value: "3022",
      },
      {
        name: "3032 (Defuse)",
        value: "3032",
      },
    ],
  },
  {
    name: "Australia",
    id: "au",
    ports: [
      {
        name: "3002 (Defuse)",
        value: "3002",
      },
    ],
  },
  {
    name: "Tournament",
    id: "tr",
    ports: [
      {
        name: "3009 (Tournament)",
        value: "3009",
      },
    ],
  },
];

function getDeflyUrl(region: string): string {
  const params = region.match(/\?region=(\w+)&port=(\d+)/);
  if (!params?.length) return "https://defly.io/";

  const port = params[2];
  const regionId = params[1];

  let deflyUrl = "https://defly.io/";
  if (port && regionId) {
    if (port.endsWith("5")) {
      deflyUrl += "#1-";
    } else if (port.endsWith("2")) {
      deflyUrl += "#2-";
    } else if (port.endsWith("9")) {
      return "https://defly.io/";
    }
    if (regionId === "use") {
      deflyUrl += "use4:";
    } else if (regionId === "usw") {
      deflyUrl += "usw4:";
    } else if (regionId === "eu") {
      deflyUrl += "eu1-1:";
    } else if (regionId === "au") {
      deflyUrl += "au2:";
    } else if (regionId === "tr") {
      deflyUrl += "use5:";
    }
    deflyUrl += port;
  }
  return deflyUrl;
}

function escapeMarkdown(text: string): string {
  const markdownCharacters = ["_", "*", "[", "]", "(", ")", "~", "`", ">", "#", "+", "-", ".", "!"];
  let escapedText = "";

  for (let i = 0; i < text.length; i++) {
    if (markdownCharacters.includes(text[i])) {
      escapedText += `\\${text[i]}`;
    } else {
      escapedText += text[i];
    }
  }

  return escapedText;
}

function Dropdown(props: { onValueChange: (newValue: string) => void; region: string }) {
  return (
    <List.Dropdown
      value={props.region}
      tooltip="Select Region & Port"
      onChange={(newValue) => {
        props.onValueChange(newValue);
      }}
    >
      {regions.map((region) => {
        return (
          <List.Dropdown.Section key={region.name} title={region.name}>
            {region.ports.map((port) => {
              return (
                <List.Dropdown.Item
                  key={`?region=${region.id}&port=${port.value}`}
                  value={`?region=${region.id}&port=${port.value}`}
                  keywords={[
                    region.name,
                    port.name,
                    (port.name.match(/\(([^)]+)\)/) || [])[1],
                    region.id,
                    region.id + port.value,
                  ]}
                  title={region.name + " - " + port.name}
                />
              );
            })}
          </List.Dropdown.Section>
        );
      })}
    </List.Dropdown>
  );
}

function Main(props: { region: string; onValueChange: (newValue: string) => void }) {
  const [showingDetail, setShowingDetail] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: teams,
    isLoading,
    error,
  } = useFetch<Team[]>(`https://defly-websocket.isra.workers.dev/${props.region}`);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong. The map may be closed.",
        message: error.message,
      });
    }
  }, [error]);

  const filteredTeams = teams?.filter((team) => {
    if (searchQuery === "") return true;
    const lowerCaseQuery = searchQuery.toLowerCase();
    return team.players.some((player) => player.name.toLowerCase().includes(lowerCaseQuery));
  });

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail}
      searchBarPlaceholder="Search players..."
      navigationTitle={`Defly.io teams (${teams?.map((i) => i.players.length).reduce((a, b) => (a + b) as 1)} players)`}
      onSearchTextChange={(query) => setSearchQuery(query)}
      searchBarAccessory={
        <Dropdown
          region={props.region}
          onValueChange={(newValue) => {
            props.onValueChange(newValue);
          }}
        />
      }
    >
      {filteredTeams
        ? filteredTeams.map((team) => {
            const itemProps: Partial<List.Item.Props> = showingDetail
              ? {
                  detail: (
                    <List.Item.Detail
                      markdown={`# ${team.team.color}\n${team.mapPercent.toFixed(2)}%\n${team.players
                        .map((player) => {
                          const playerName = escapeMarkdown(player.name);
                          return `- ${playerName} ${
                            player.badge
                              ? `<img src="https://defly.io/img/badges/${player.badge}.png" alt="Badge ${player.badge}" title="Badge ${player.badge}" height="16">`
                              : ""
                          }`;
                        })
                        .join("\n")}`}
                    />
                  ),
                }
              : { accessories: [{ text: team.players.map((player) => player.name).join(", ") }] };
            return (
              <List.Item
                key={team.team.ID}
                title={team.team.color}
                icon={{
                  source: team.available ? Icon.CircleFilled : Icon.XMarkCircleFilled,
                  tintColor: `#${team.team.hex}`,
                  tooltip: team.available ? undefined : "Team Unavailable",
                }}
                subtitle={`${team.players.length}/${team.maxSize} - ${team.mapPercent.toFixed(2)}%`}
                {...itemProps}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      url={getDeflyUrl(props.region)}
                      shortcut={{ modifiers: ["cmd"], key: "enter" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Defly URL"
                      content={getDeflyUrl(props.region)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                    />
                    <Action
                      icon={Icon.Sidebar}
                      title="Toggle Detail"
                      onAction={() => setShowingDetail(!showingDetail)}
                      shortcut={{
                        modifiers: ["cmd", "shift"],
                        key: "d",
                      }}
                    />
                  </ActionPanel>
                }
              />
            );
          })
        : null}
    </List>
  );
}
export default function Command(
  props: LaunchProps<{
    arguments: {
      region: string;
      port: string;
    };
  }>
) {
  const [selectedRegion, setSelectedRegion] = useState<string>("?region=use&port=3005");

  useEffect(() => {
    const fetchStoredRegion = async () => {
      const storedRegion = await LocalStorage.getItem("selectedRegion");
      if (props.arguments.region && props.arguments.port) {
        const newRegion = `?region=${props.arguments.region.toLowerCase().trim()}&port=${props.arguments.port
          .toLowerCase()
          .trim()}`;
        setSelectedRegion(newRegion);
        LocalStorage.setItem("selectedRegion", newRegion);
      } else if (storedRegion) {
        setSelectedRegion(storedRegion as string);
      }
    };
    fetchStoredRegion();
  }, [props.arguments.region, props.arguments.port]);

  return (
    <Main
      region={selectedRegion}
      onValueChange={(newValue) => {
        setSelectedRegion(newValue);
        LocalStorage.setItem("selectedRegion", newValue);
      }}
    />
  );
}
