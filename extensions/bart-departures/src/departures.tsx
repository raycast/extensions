import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useFetch } from "@raycast/utils";
interface Estimate {
    minutes: string;
    platform: string;
    color: string;
    delay: string;
    cancelflag: string;
    length: string;
    direction: string;
}

interface ETD {
    destination: string;
    estimate: Estimate[];
}

interface StationData {
    etd: ETD[];
}

interface DepartureResponse {
    root: {
        station: StationData[];
    };
}

interface BSA {
    type: string;
    description: { "#cdata-section": string };
}

interface AlertResponse {
    root: {
        bsa: BSA[];
    };
}

const stations = [
    {
        title: "12th Street / Oakland City Center",
        value: "12TH",
        lines: ["red", "orange", "yellow"],
    },
    {
        title: "16th Street / Mission",
        value: "16TH",
        lines: ["red", "yellow", "green", "blue"],
    },
    {
        title: "19th Street Oakland",
        value: "19TH",
        lines: ["red", "orange", "yellow"],
    },
    {
        title: "24th Street / Mission",
        value: "24TH",
        lines: ["red", "yellow", "green", "blue"],
    },
    {
        title: "Antioch",
        value: "ANTC",
        lines: ["yellow"],
    },
    {
        title: "Ashby",
        value: "ASHB",
        lines: ["red", "orange"],
    },
    {
        title: "Balboa Park",
        value: "BALB",
        lines: ["red", "yellow", "green", "blue"],
    },
    {
        title: "Bay Fair",
        value: "BAYF",
        lines: ["orange", "green", "blue"],
    },
    {
        title: "Berryessa",
        value: "BERY",
        lines: ["green", "orange"],
    },
    {
        title: "Castro Valley",
        value: "CAST",
        lines: ["yellow"],
    },
    {
        title: "Civic Center",
        value: "CIVC",
        lines: ["red", "yellow", "green", "blue"],
    },
    {
        title: "Coliseum",
        value: "COLS",
        lines: ["orange", "green", "blue"],
    },
    {
        title: "Colma",
        value: "COLM",
        lines: ["yellow", "red"],
    },
    {
        title: "Concord",
        value: "CONC",
        lines: ["yellow"],
    },
    {
        title: "Daly City",
        value: "DALY",
        lines: ["yellow", "red", "blue", "green"],
    },
    {
        title: "Downtown Berkeley",
        value: "DBRK",
        lines: ["red", "orange"],
    },
    {
        title: "Dublin / Pleasanton",
        value: "DUBL",
        lines: ["blue"],
    },
    {
        title: "El Cerrito Del Norte",
        value: "DELN",
        lines: ["red", "orange"],
    },
    {
        title: "El Cerrito Plaza",
        value: "PLZA",
        lines: ["red", "orange"],
    },
    {
        title: "Embarcadero",
        value: "EMBR",
        lines: ["red", "yellow", "green", "blue"],
    },
    {
        title: "Fremont",
        value: "FRMT",
        lines: ["green", "orange"],
    },
    {
        title: "Fruitvale",
        value: "FTVL",
        lines: ["orange", "green", "blue"],
    },
    {
        title: "Glen Park",
        value: "GLEN",
        lines: ["red", "yellow", "green", "blue"],
    },
    {
        title: "Hayward",
        value: "HAYW",
        lines: ["orange", "green"],
    },
    {
        title: "Lafayette",
        value: "LAFY",
        lines: ["yellow"],
    },
    {
        title: "Lake Merritt",
        value: "LAKE",
        lines: ["orange", "blue", "green"],
    },
    {
        title: "MacArthur",
        value: "MCAR",
        lines: ["red", "orange", "yellow"],
    },
    {
        title: "Millbrae",
        value: "MLBR",
        lines: ["yellow", "red"],
    },
    {
        title: "Milpitas",
        value: "MLPT",
        lines: ["green", "orange"],
    },
    {
        title: "Montgomery Street",
        value: "MONT",
        lines: ["red", "yellow", "green", "blue"],
    },
    {
        title: "North Berkeley",
        value: "NBRK",
        lines: ["red", "orange"],
    },
    {
        title: "North Concord / Martinez",
        value: "NCON",
        lines: ["yellow"],
    },
    {
        title: "Orinda",
        value: "ORIN",
        lines: ["yellow"],
    },
    {
        title: "Pittsburg / Bay Point",
        value: "PITT",
        lines: ["yellow"],
    },
    {
        title: "Pittsburg Center",
        value: "PCTR",
        lines: ["yellow"],
    },
    {
        title: "Pleasant Hill / Contra Costa Centre",
        value: "PHIL",
        lines: ["yellow"],
    },
    {
        title: "Powell Street",
        value: "POWL",
        lines: ["red", "yellow", "green", "blue"],
    },
    {
        title: "Richmond",
        value: "RICH",
        lines: ["red", "orange"],
    },
    {
        title: "Rockridge",
        value: "ROCK",
        lines: ["yellow"],
    },
    {
        title: "San Bruno",
        value: "SBRN",
        lines: ["yellow", "red"],
    },
    {
        title: "SFO",
        value: "SFIA",
        lines: ["yellow", "red"],
    },
    {
        title: "San Leandro",
        value: "SANL",
        lines: ["orange", "green", "blue"],
    },
    {
        title: "South Hayward",
        value: "SHAY",
        lines: ["orange", "green"],
    },
    {
        title: "South San Francisco",
        value: "SSAN",
        lines: ["yellow", "red"],
    },
    {
        title: "Union City",
        value: "UCTY",
        lines: ["orange", "green"],
    },
    {
        title: "Walnut Creek",
        value: "WCRK",
        lines: ["yellow"],
    },
    {
        title: "Warm Springs",
        value: "WARM",
        lines: ["green", "orange"],
    },
    {
        title: "West Dublin / Pleasanton",
        value: "WDUB",
        lines: ["blue"],
    },
    {
        title: "West Oakland",
        value: "WOAK",
        lines: ["red", "green", "blue", "yellow"],
    },
];

// Line color mapping
const lines: Record<string, string> = {
    blue: "🟦",
    red: "🟥",
    yellow: "🟨",
    green: "🟩",
    orange: "🟧",
    purple: "🟪",
    beige: "🟫",
};

export default function Command() {
    const { push } = useNavigation();

    return (
        <List>
            {stations.map((station) => (
                <List.Item
                    icon={Icon.Train}
                    key={station.value}
                    title={station.title}
                    actions={
                        <ActionPanel>
                            <Action
                                title="View Departures"
                                onAction={() =>
                                    push(
                                        <DepartureDetail
                                            station={station.value}
                                        />,
                                    )}
                            />
                        </ActionPanel>
                    }
                />
            ))}
        </List>
    );
}

function DepartureDetail({ station }: { station: string }) {
    const API_KEY = "Q58Q-PEEI-9DLT-DWEI";
    const DEPARTURE_URL =
        `https://api.bart.gov/api/etd.aspx?cmd=etd&orig=${station}&key=${API_KEY}&json=y`;
    const ALERT_URL =
        `https://api.bart.gov/api/bsa.aspx?cmd=bsa&key=${API_KEY}&json=y`;

    const { isLoading: isDeparturesLoading, data: departuresData } = useFetch(
        DEPARTURE_URL,
        {
            parseResponse: (res) => res.json() as Promise<DepartureResponse>,
        },
    );

    const { isLoading: isAlertLoading, data: alertData } = useFetch(ALERT_URL, {
        parseResponse: (res) => res.json() as Promise<AlertResponse>,
    });

    if (isDeparturesLoading || isAlertLoading) {
        return <List isLoading={true} />;
    }

    const stationData = departuresData?.root?.station?.[0];
    const alertMessage =
        alertData?.root?.bsa?.[0]?.description["#cdata-section"] !=
                "No delays reported."
            ? alertData?.root?.bsa?.[0]?.description["#cdata-section"]
            : null;

    // If no departures data, show a message
    if (!stationData || !stationData?.etd) {
        return (
            <List>
                <List.EmptyView
                    title="No departures found"
                    description="Please try again later."
                />
            </List>
        );
    }

    // Organizing departures by platform
    const platformDepartures: Record<
        string,
        Record<string, { estimates: Estimate[]; color: string }>
    > = {};

    stationData?.etd.forEach((destination) => {
        destination.estimate.forEach((est) => {
            if (est.cancelflag === "1") return; // Skip canceled trips

            if (!platformDepartures[est.platform]) {
                platformDepartures[est.platform] = {};
            }
            if (!platformDepartures[est.platform][destination.destination]) {
                platformDepartures[est.platform][destination.destination] = {
                    estimates: [],
                    color: est.color.toLowerCase(),
                };
            }

            platformDepartures[est.platform][destination.destination].estimates
                .push(est);
        });
    });

    return (
        <List isShowingDetail>
            {/* Only show Service Alerts if an alert exists */}
            {alertMessage && (
                <List.Section title="Service Alerts">
                    <List.Item
                        title={String(alertMessage).split(".")[0]}
                        icon={Icon.Warning}
                        detail={
                            <List.Item.Detail markdown={String(alertMessage)} />
                        }
                    />
                </List.Section>
            )}

            {/* Departures Organized by Platform */}
            {Object.entries(platformDepartures).map((
                [platform, destinations],
            ) => (
                <List.Section key={platform} title={`Platform ${platform}`}>
                    {Object.entries(destinations).map(([destination, data]) => (
                        <List.Item
                            key={`${destination}-${platform}`}
                            title={`${
                                lines[data.color] || "⬜"
                            } ${destination}`}
                            subtitle={`${
                                data.estimates
                                    .map((est) => (est.delay !== "0"
                                        ? `${
                                            Math.floor(parseInt(est.delay) / 60)
                                        }`
                                        : est.minutes)
                                    )
                                    .join(", ")
                            }`}
                            detail={
                                <List.Item.Detail
                                    markdown={`# ${
                                        lines[data.color] || "⬜"
                                    } ${destination}\n\n**Upcoming Departures:**\n${
                                        data.estimates
                                            .map(
                                                (est) =>
                                                    `- **${
                                                        est.delay !== "0"
                                                            ? `${
                                                                Math.floor(
                                                                    parseInt(
                                                                        est.delay,
                                                                    ) / 60,
                                                                )
                                                            }*`
                                                            : est.minutes
                                                    } ${
                                                        est.minutes == "Leaving"
                                                            ? ""
                                                            : "mins"
                                                    }** (${est.length} cars)${
                                                        est.delay !== "0"
                                                            ? ` _(Late by ${
                                                                Math.floor(
                                                                    parseInt(
                                                                        est.delay,
                                                                    ) / 60,
                                                                )
                                                            } min)_`
                                                            : ""
                                                    }`,
                                            )
                                            .join("\n")
                                    }
                    `}
                                />
                            }
                        />
                    ))}
                </List.Section>
            ))}
        </List>
    );
}
