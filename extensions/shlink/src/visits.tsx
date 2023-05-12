import { Action, ActionPanel, Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { ActionCopyToClipboard, HealthCheck, useApiFetchPaginationExtract } from "./shared";
import { useState } from "react";
import UAParser from "ua-parser-js";

interface Props {
  item?: {
    type: "tags" | "domains" | "short-urls";
    value: string;
    title?: string;
    placeholder?: string;
  };
}

interface VisitLocation {
  countryCode: string; // "RU";
  countryName: string; // "Russia";
  regionName: string; // "Voronezh Oblast";
  cityName: string; // "Voronezh";
  latitude: number; // 51.672;
  longitude: number; // 39.1843;
  timezone: string; // "Europe/Moscow";
  isEmpty: boolean; // What? // false;
}

interface NonOrphansVisits {
  visitType?: "nonOrphans" | "orphans"; // not from API
  referer: string;
  date: string; // "2023-05-09T14:25:52+00:00";
  dateObj?: Date; // not from API;
  userAgent: string; // "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Mobile Safari/537.36";
  visitLocation?: VisitLocation;
  potentialBot: boolean;
}

type orphansVisitsType = "invalid_short_url" | "base_url" | "regular_404";

interface OrphansVisits extends NonOrphansVisits {
  visitedUrl: string;
  type: orphansVisitsType;
}

type VisitObject = OrphansVisits | NonOrphansVisits;
type ShowOrphansType = "all" | "orphans" | "nonOrphans";

const orphansVisitsTypeMap: Map<orphansVisitsType, string> = new Map([
  ["invalid_short_url", "Invalid Short URL"],
  ["base_url", "Base URL"],
  ["regular_404", "Regular 404"],
]);

export default function Command({ item }: Props) {
  const [showOrphansType, setShowOrphansType] = useCachedState<ShowOrphansType>("showOrphansType", "all");

  let items: VisitObject[];
  let revalidate: () => void;
  let isLoading: boolean;
  if (!item) {
    const {
      isLoading: isLoadingOrphans,
      data: dataOrphansRaw,
      revalidate: revalidateOrphans,
    } = useApiFetchPaginationExtract<OrphansVisits>("visits/orphan", "visits");
    dataOrphansRaw?.forEach((visit) => {
      visit.visitType = "orphans";
      visit.dateObj = new Date(visit.date);
    });

    const {
      isLoading: isLoadingNonOrphans,
      data: dataNonOrphansRaw,
      revalidate: revalidateNonOrphans,
    } = useApiFetchPaginationExtract<NonOrphansVisits>("visits/non-orphan", "visits");
    dataNonOrphansRaw?.forEach((visit) => {
      visit.visitType = "nonOrphans";
      visit.dateObj = new Date(visit.date);
    });
    const d = (item: VisitObject) => item?.dateObj || new Date(item.date);

    isLoading = {
      orphans: isLoadingOrphans,
      nonOrphans: isLoadingNonOrphans,
      all: isLoadingOrphans || isLoadingNonOrphans,
    }[showOrphansType];

    items = {
      orphans: dataOrphansRaw,
      nonOrphans: dataNonOrphansRaw,
      all: [...dataOrphansRaw, ...dataNonOrphansRaw].sort((a, b) => d(b).getTime() - d(a).getTime()),
    }[showOrphansType];

    revalidate = {
      orphans: revalidateOrphans,
      nonOrphans: revalidateNonOrphans,
      all: () => {
        revalidateOrphans();
        revalidateNonOrphans();
      },
    }[showOrphansType];
  } else {
    const {
      data: newData,
      revalidate: newRevalidate,
      isLoading: newIsLoading,
    } = useApiFetchPaginationExtract<VisitObject>(`${item.type}/${item.value}/visits`, "visits");
    items = newData;
    revalidate = newRevalidate;
    isLoading = newIsLoading;
  }

  return (
    <ShlinkViewsList
      items={items}
      showOrphansType={[showOrphansType, setShowOrphansType]}
      revalidate={revalidate}
      isLoading={isLoading}
      placeholder={item?.placeholder}
      title={item?.title}
    />
  );
}

interface ShlinkViewsListProps {
  items: (OrphansVisits | NonOrphansVisits)[];
  showOrphansType: [ShowOrphansType, (showOrphansType: ShowOrphansType) => void];
  revalidate: () => void;
  isLoading: boolean;
  title?: string;
  placeholder?: string;
}

function ShlinkViewsList({
  items,
  showOrphansType: [showOrphansType, setShowOrphansType],
  revalidate,
  isLoading,
  title,
  placeholder,
}: ShlinkViewsListProps) {
  const [healthCheck, setHealthCheck] = useState<boolean>(false);

  const [showMap, setShowMap] = useCachedState<boolean>("showMap", false);
  const [showDetails, setShowDetails] = useCachedState<boolean>("showDetails", false);

  const refreshAction = (
    <Action
      icon={{ source: Icon.Repeat }}
      title="Refresh Data"
      key="reload"
      onAction={revalidate}
      shortcut={{ key: "r", modifiers: ["cmd"] }}
    />
  );

  const actions = [
    <Action
      icon={{ source: Icon.Sidebar }}
      title={showDetails ? "Hide Details" : "Show Details"}
      key="details"
      onAction={() => setShowDetails(!showDetails)}
    />,
    <Action
      icon={{ source: Icon.Map }}
      title={showMap ? "Hide Map" : "Show Map"}
      key="map"
      onAction={() => setShowMap(!showMap)}
    />,
    refreshAction,
  ];

  return (
    <HealthCheck onLoading={setHealthCheck} renderWhileLoading>
      <List
        isLoading={healthCheck || isLoading}
        isShowingDetail={showDetails}
        navigationTitle={title}
        searchBarPlaceholder={placeholder}
        searchBarAccessory={
          <List.Dropdown
            tooltip="Filter by Orphans Type"
            value={showOrphansType}
            onChange={(e) => setShowOrphansType(e as ShowOrphansType)}
            filtering={{ keepSectionOrder: true }}
            defaultValue="any"
            throttle
          >
            <List.Dropdown.Item title="All" value="all" />
            <List.Dropdown.Item title="Non-Orphans Views" value="nonOrphans" />
            <List.Dropdown.Item title="Orphans Views" value="orphans" />
          </List.Dropdown>
        }
      >
        {items?.length ? (
          <List.Section title="Short URLs" subtitle={items?.length.toString()}>
            {items?.map((item, index) => (
              <ShlinkViewsListItem
                key={index}
                item={item}
                showMap={showMap}
                showDetail={showDetails}
                showVisitType={showOrphansType === "all"}
                extraActions={actions}
                refresh={revalidate}
              />
            ))}
          </List.Section>
        ) : (
          <List.EmptyView
            actions={<ActionPanel>{refreshAction}</ActionPanel>}
            title="No Visits Found"
            icon={{
              source: "👀",
            }}
          />
        )}
      </List>
    </HealthCheck>
  );
}

interface ShlinkViewsListItemProps {
  item: VisitObject;
  showDetail: boolean;
  showMap: boolean;
  showVisitType: boolean;
  extraActions?: JSX.Element[];
  refresh?: () => void;
}

function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function ShlinkViewsListItem({ item, showDetail, showMap, showVisitType, extraActions }: ShlinkViewsListItemProps) {
  const accessories: List.Item.Accessory[] = [];

  if (showVisitType) {
    accessories.push({
      text: item.visitType === "nonOrphans" ? "Non-Orphan" : "Orphan",
      tooltip: "Visit Type",
      icon: {
        source: Icon.Eye,
      },
    });
  }

  const browser = new UAParser(item.userAgent).getBrowser();

  if (browser.name) {
    accessories.push({
      text: browser.name,
      tooltip: "Browser",
      icon: {
        source: Icon.Globe,
      },
    });
  }

  const date = item.dateObj || new Date(item.date);
  accessories.push({
    date,
    tooltip: "Visit Date",
  });

  const locationString =
    item.visitLocation && !item.visitLocation?.isEmpty
      ? [
          [
            item.visitLocation?.countryCode ? getFlagEmoji(item.visitLocation?.countryCode) : "",
            item.visitLocation?.countryName,
          ]
            .filter((x) => x)
            .join(" "),
          item.visitLocation?.regionName,
          item.visitLocation?.cityName,
        ]
          .filter((x) => x)
          .join(", ")
      : "Unknown";
  const { thunderforestApiKey, thunderforestType } = getPreferenceValues<ExtensionPreferences>();

  const mapLink =
    item.visitLocation && !item.visitLocation?.isEmpty
      ? `https://tile.thunderforest.com/static/${thunderforestType}/` +
        `${item.visitLocation.longitude},${item.visitLocation.latitude},14/300x125@2x.png?` +
        `apikey=${thunderforestApiKey}`
      : "";

  return (
    <List.Item
      icon={{
        source: item.potentialBot ? Icon.Monitor : Icon.Person,
        tintColor: item.potentialBot ? Color.Red : Color.Blue,
      }}
      title={locationString}
      detail={
        <List.Item.Detail
          metadata={<ShlinkViewsListItemDetailMetadata item={item} />}
          markdown={
            showMap && item.visitLocation && !item.visitLocation?.isEmpty
              ? `![Map for ${locationString}](${mapLink})`
              : null
          }
        />
      }
      accessories={!showDetail ? accessories : []}
      actions={
        <ActionPanel>
          <ActionPanel.Section>{extraActions}</ActionPanel.Section>
          <ActionPanel.Section title="Copy ... to Clipboard">
            <ActionCopyToClipboard
              title="Copy User-Agent to Clipboard"
              shortcut={{ key: "c", modifiers: ["cmd"] }}
              content={item.userAgent}
              toastTitle="Copied User-Agent to Clipboard!"
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function ShlinkViewsListItemDetailMetadata({ item }: { item: VisitObject }) {
  const M = List.Item.Detail.Metadata;
  const meta: JSX.Element[] = [];

  let sepCount = 0;

  function sep() {
    sepCount++;
    return <M.Separator key={`sep-${sepCount}`} />;
  }

  meta.push(
    <M.Label key="visitType" title="Visit Type" text={item.visitType === "nonOrphans" ? "Non-Orphans" : "Orphans"} />,
    <M.Label key="referer" title="Referer" text={item.referer || "-"} />
  );
  if (item.visitType === "orphans") {
    const i = item as OrphansVisits;
    meta.push(
      <M.Label key="visitedUrl" title="Visited URL" text={i.visitedUrl || "-"} />,
      <M.Label key="type" title="Visit Type" text={orphansVisitsTypeMap.get(i.type) || "-"} />
    );
  }

  meta.push(
    <M.Label key="requestDate" title="Date Requested" text={(new Date(item.date) || item.dateObj).toLocaleString()} />,
    <M.Label
      key="potentialBot"
      title="Potential Bot"
      icon={{
        source: item.potentialBot ? Icon.Monitor : Icon.Person,
        tintColor: item.potentialBot ? Color.Red : Color.Blue,
      }}
      text={item.potentialBot ? "Yes" : "No"}
    />
  );

  if (item.userAgent) {
    const ua = new UAParser(item.userAgent).getResult();
    meta.push(
      sep(),
      <M.Label key="userAgentTitle" title="User-Agent Data" />,
      <M.Label key="userAgent" title="User-Agent" text={item.userAgent} />,

      sep(),
      <M.Label key="browser" title="Browser Info" />,
      <M.Label key="browserName" title="Browser Name" text={ua.browser.name || "-"} />,
      <M.Label key="browserVersion" title="Browser Version" text={ua.browser.version || "-"} />,

      sep(),
      <M.Label key="device" title="Device Info" />,
      <M.Label key="deviceType" title="Device Type" text={ua.device.type || "-"} />,
      <M.Label key="deviceVendor" title="Device Vendor" text={ua.device.vendor || "-"} />,
      <M.Label key="deviceModel" title="Device Model" text={ua.device.model || "-"} />,

      sep(),
      <M.Label key="engine" title="Engine Info" />,
      <M.Label key="engineName" title="Engine Name" text={ua.engine.name || "-"} />,
      <M.Label key="engineVersion" title="Engine Version" text={ua.engine.version || "-"} />,

      sep(),
      <M.Label key="os" title="OS Info" />,
      <M.Label key="osName" title="OS" text={ua.os.name || "-"} />,
      <M.Label key="osVersion" title="OS Version" text={ua.os.version || "-"} />,
      <M.Label key="cpu" title="CPU Type" text={ua.cpu.architecture || "-"} />,

      sep()
    );
  }

  if (item.visitLocation && !item.visitLocation?.isEmpty) {
    const loc = item.visitLocation;
    meta.push(
      sep(),
      <M.Label key="visits" title="Location Data" />,
      <M.Label
        key="countryCode"
        title="Country Code"
        icon={
          loc.countryCode
            ? {
                source: getFlagEmoji(loc.countryCode),
              }
            : undefined
        }
        text={loc.countryCode || "-"}
      />,
      <M.Label title="Country" key="Country" text={loc.countryName || "-"} />,
      <M.Label title="Region" key="Region" text={loc.regionName || "-"} />,
      <M.Label title="City" key="City" text={loc.cityName || "-"} />,
      <M.Label title="Latitude" key="Latitude" text={loc.latitude.toString() || "-"} />,
      <M.Label title="Longitude" key="Longitude" text={loc.longitude.toString() || "-"} />,
      <M.Label title="Timezone" key="Timezone" text={loc.timezone || "-"} />,
      sep()
    );
  }

  meta.reduce((previousValue, currentValue) => {
    if (previousValue.at(-1)?.type === M.Separator && currentValue.type === M.Separator) {
      return previousValue;
    }
    return [...previousValue, currentValue];
  }, [] as JSX.Element[]);

  if (meta.at(0)?.type === M.Separator) {
    meta.shift();
  }
  if (meta.at(-1)?.type === M.Separator) {
    meta.pop();
  }

  return (
    <M>
      {meta.reduce((previousValue, currentValue) => {
        if (previousValue.at(-1)?.type === M.Separator && currentValue.type === M.Separator) {
          return previousValue;
        }
        return [...previousValue, currentValue];
      }, [] as JSX.Element[])}
    </M>
  );
}
