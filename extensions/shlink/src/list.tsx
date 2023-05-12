import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  Image,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { getFavicon, useCachedState } from "@raycast/utils";
import {
  ActionCopyToClipboard,
  apiFetch,
  hashedHSL,
  HealthCheck,
  ShlinkObject,
  useApiFetchPaginationExtract,
} from "./shared";
import { useState } from "react";
import { EditShlink } from "./edit";
import Visits from "./visits";

export default function Command() {
  const [healthCheck, setHealthCheck] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>("");
  const [searchType, setSearchType] = useState<string>("any");

  const [showQR, setShowQR] = useCachedState<boolean>("showQR", false);
  const [showDetail, setShowDetail] = useCachedState<boolean>("isShowingDetail", false);

  const { isLoading, data, revalidate } = useApiFetchPaginationExtract<ShlinkObject>("short-urls", "shortUrls");

  const searchBy: Map<string, (item: ShlinkObject) => string> = new Map([
    ["Title", (item: ShlinkObject) => item.title ?? ""],
    ["Short URL", (item: ShlinkObject) => item.shortUrl],
    ["Long URL", (item: ShlinkObject) => item.longUrl],
    ["Short Code", (item: ShlinkObject) => item.shortCode],
    ["Tags", (item: ShlinkObject) => item.tags.join(" ")],
    ["Domains", (item: ShlinkObject) => item.domain ?? ""],
  ]);

  const items = data?.filter((item) => {
    const text = searchText.trim().toLowerCase();
    if (!text) {
      return true;
    }
    if (searchType === "any") {
      return Array.from(searchBy.values()).some((search) => search(item).toLowerCase().includes(text));
    } else {
      return searchBy.get(searchType)?.(item).toLowerCase().includes(text);
    }
  });

  return (
    <HealthCheck onLoading={setHealthCheck} renderWhileLoading>
      <List
        searchText={searchText}
        onSearchTextChange={setSearchText}
        isLoading={healthCheck || isLoading}
        isShowingDetail={showDetail}
        navigationTitle="Search Short URLs"
        searchBarPlaceholder="Search your short links"
        searchBarAccessory={
          <List.Dropdown
            tooltip="Search by ..."
            value={searchType}
            onChange={setSearchType}
            filtering={{ keepSectionOrder: true }}
            defaultValue="any"
            throttle
          >
            {[
              <List.Dropdown.Item title="Search Anywhere" value="any" key="any" />,
              ...Array.from(searchBy.keys()).map((key) => (
                <List.Dropdown.Item title={`Search by ${key}`} value={key} key={key} />
              )),
            ]}
          </List.Dropdown>
        }
      >
        {items?.length ? (
          <List.Section title="Short URLs" subtitle={items?.length.toString()}>
            {items?.map((item) => (
              <ShlinkListItem
                key={item.shortCode}
                item={item}
                showQR={showQR}
                showDetail={showDetail}
                actions={
                  <Actions
                    revalidate={revalidate}
                    item={item}
                    showQR={showQR}
                    setShowQR={setShowQR}
                    showDetail={showDetail}
                    setShowDetail={setShowDetail}
                  />
                }
              />
            ))}
          </List.Section>
        ) : (
          <List.EmptyView actions={<Actions />} title="No Short URLs Found" icon={{ source: "🔗" }} />
        )}
      </List>
    </HealthCheck>
  );
}

interface ShlinkListItemProps {
  item: ShlinkObject;
  showQR: boolean;
  showDetail: boolean;
  actions: JSX.Element;
}

function ShlinkListItem({ item, showDetail, showQR, actions }: ShlinkListItemProps) {
  const accessories: List.Item.Accessory[] = [];
  if (item.longUrl) {
    accessories.push({
      text: item.longUrl,
      tooltip: "Long URL",
    });
  }
  if (item.tags.length) {
    accessories.push({
      text: item.tags.join(", "),
      tooltip: "Tags",
      icon: { source: Icon.Tag },
    });
  }
  if (item.visitsSummary) {
    accessories.push(
      item.visitsSummary.bots
        ? {
            text: `👀 ${item.visitsSummary.total} (🤖 ${item.visitsSummary.bots}  💁 ${item.visitsSummary.nonBots})`,
            tooltip: "Total Visits count = Bots count + Non-Bots count",
          }
        : {
            text: `👀 ${item.visitsSummary.total}`,
            tooltip: "Total Visits",
          }
    );
  }
  if (item.dateCreated) {
    const date = new Date(item.dateCreated);
    accessories.push({
      date,
      tooltip: "Creation Date",
    });
  }

  return (
    <List.Item
      icon={getFavicon(item.longUrl, { fallback: "🔗", mask: Image.Mask.RoundedRectangle })}
      title={item.title || item.shortUrl}
      subtitle={item.title ? item.shortUrl : ""}
      detail={
        <List.Item.Detail
          metadata={<ShlinkListItemDetailMetadata item={item} />}
          markdown={
            showQR
              ? `![QRCode for short url](${item.shortUrl}/qr-code?roundBlockSize=true&size=200&margin=10&format=png)`
              : null
          }
        />
      }
      accessories={!showDetail ? accessories : []}
      actions={actions}
    />
  );
}

function ShlinkListItemDetailMetadata({ item }: { item: ShlinkObject }) {
  const M = List.Item.Detail.Metadata;
  const meta: JSX.Element[] = [];

  let sepCount = 0;

  function sep() {
    sepCount++;
    return <M.Separator key={`sep-${sepCount}`} />;
  }

  meta.push(
    <M.Label key="title" title="Title" text={item.title || "-"} />,
    <M.Label key="longUrl" title="Long URL" text={item.longUrl} />,
    <M.Label key="shortUrl" title="Short URL" text={item.shortUrl} />,
    <M.Label key="shortCode" title="Short Code" text={item.shortCode} />,

    <M.Label key="domain" title="Domain" text={item.domain || "-"} />,

    <M.Label
      key="dateCreated"
      title="Date Created"
      text={item.dateCreated ? new Date(item.dateCreated).toLocaleString() : "-"}
    />
  );
  if (item.crawlable !== undefined) {
    meta.push(
      <M.Label
        key="crawlable"
        title="Crawlable"
        icon={{
          source: item.crawlable ? Icon.CheckCircle : Icon.Circle,
          tintColor: item.crawlable ? Color.Green : Color.Red,
        }}
      />
    );
  }
  if (item.forwardQuery !== undefined) {
    meta.push(
      <M.Label
        key="forwardQuery"
        title="Forward Query"
        icon={{
          source: item.forwardQuery ? Icon.CheckCircle : Icon.Circle,
          tintColor: item.forwardQuery ? Color.Green : Color.Red,
        }}
      />
    );
  }

  if (item.tags) {
    meta.push(
      <M.TagList title="Link Tags" key="tags">
        {item.tags.map((tag) => (
          <M.TagList.Item key={`tag-${tag}`} text={tag} color={hashedHSL(tag)} />
        ))}
      </M.TagList>
    );
  }

  if (item.visitsSummary) {
    meta.push(
      sep(),
      <M.Label key="visits" title="Visits" />,
      <M.Label key="totalVisits" title="👀 Total Visits" text={item.visitsSummary.total.toString()} />,
      <M.Label key="botsVisits" title="🤖 Bots Visits" text={item.visitsSummary.bots.toString()} />,
      <M.Label key="nonBotsVisits" title="💁 Non-Bots Visits" text={item.visitsSummary.nonBots.toString()} />,
      sep()
    );
  }

  if (item.deviceLongUrls) {
    const { desktop, ios, android } = item.deviceLongUrls;
    meta.push(
      sep(),
      <M.Label key="deviceLongUrls" title="Device Long URLs" />,
      <M.Label key="deviceDesktop" title="🖥️ Desktop" text={desktop || "-"} />,
      <M.Label key="deviceIos" title="🍎 iOS" text={ios || "-"} />,
      <M.Label key="deviceAndroid" title="🤖 Android" text={android || "-"} />,
      sep()
    );
  }

  if (item.meta) {
    const { validSince, validUntil, maxVisits } = item.meta;
    meta.push(
      sep(),
      <M.Label key="meta" title="Meta-info" />,
      <M.Label
        key="validSince"
        title="URL Valid Since"
        text={validSince ? new Date(validSince).toLocaleString() : "-"}
      />,
      <M.Label
        key="validUntil"
        title="URL Valid Until"
        text={validUntil ? new Date(validUntil).toLocaleString() : "-"}
      />,
      <M.Label key="maxVisits" title="Max Visits" text={typeof maxVisits === "number" ? maxVisits.toString() : "-"} />,
      sep()
    );
  }
  if (!meta.length) {
    return null;
  }

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

function Actions({
  item,
  revalidate,
  showDetail,
  setShowDetail,
  showQR,
  setShowQR,
}: {
  item?: ShlinkObject;
  revalidate?: () => void;
  showDetail?: boolean;
  setShowDetail?: (show: boolean) => void;
  showQR?: boolean;
  setShowQR?: (show: boolean) => void;
}) {
  if (!item || !revalidate || setShowDetail === undefined || setShowQR === undefined) {
    return (
      <ActionPanel>
        <Action title="Reload" onAction={revalidate} />
      </ActionPanel>
    );
  }
  const { push } = useNavigation();

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          icon={{ source: Icon.Sidebar }}
          title={showDetail ? "Hide Details" : "Show Details"}
          onAction={() => setShowDetail(!showDetail)}
        />
        <Action
          title="Open Visits"
          icon={{ source: Icon.Eye }}
          onAction={() =>
            push(
              <Visits
                item={{
                  value: item.shortCode,
                  type: "short-urls",
                  placeholder: `Search Visits in ${item.title || item.shortUrl}...`,
                  title: `Visits in ${item.title || item.shortUrl}`,
                }}
              />
            )
          }
        />
        <Action
          icon={{ source: Icon.AppWindowGrid3x3 }}
          title={showQR ? "Hide QR Code" : "Show QR Code"}
          onAction={() => {
            setShowQR(!showQR);
            if (!showQR) {
              setShowDetail(true);
            }
          }}
          shortcut={{ key: "q", modifiers: ["opt"] }}
        />
        <Action
          icon={{ source: Icon.Repeat }}
          title="Refresh Data"
          onAction={revalidate}
          shortcut={{ key: "r", modifiers: ["cmd"] }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Short Link Actions">
        <Action
          title="Edit Link"
          shortcut={{ key: "e", modifiers: ["cmd"] }}
          icon={{ source: Icon.Pencil }}
          onAction={() => push(<EditShlink item={item} />)}
        />
        <Action.OpenInBrowser
          title="Open Link in Browser"
          url={item.longUrl}
          shortcut={{ key: "return", modifiers: ["shift", "cmd"] }}
        />
        <Action
          title="Delete Link"
          shortcut={{ key: "delete", modifiers: ["cmd"] }}
          icon={{ source: Icon.XMarkCircle }}
          onAction={() => deleteLinkAction({ item, revalidate })}
          style={Action.Style.Destructive}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy ... to Clipboard">
        <ActionCopyToClipboard
          title="Copy Short Url to Clipboard"
          shortcut={{ key: "c", modifiers: ["cmd"] }}
          content={item.shortUrl}
          toastTitle="Copied Short Url to Clipboard!"
        />
        <ActionCopyToClipboard
          title="Copy Long Url to Clipboard"
          shortcut={{ key: "c", modifiers: ["cmd", "shift"] }}
          content={item.longUrl}
          toastTitle="Copied Long Url to Clipboard!"
        />
        <ActionCopyToClipboard
          title="Copy QR Code Url to Clipboard"
          shortcut={{ key: "c", modifiers: ["cmd", "opt"] }}
          content={`${item.shortUrl}/qr-code`}
          toastTitle="Copied QR Code Url to Clipboard!"
        />
        <ActionCopyToClipboard
          title="Copy Tracking Pixel Url to Clipboard"
          shortcut={{ key: "c", modifiers: ["cmd", "ctrl"] }}
          content={`${item.shortUrl}/tracking`}
          toastTitle="Copied Tracking Pixel Url to Clipboard!"
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function deleteLinkAction({ item, revalidate }: { item: ShlinkObject; revalidate: () => void }) {
  async function onAction() {
    const toast = await showToast({
      title: `Deleting "${item.shortUrl}"...`,
      style: Toast.Style.Animated,
    });

    try {
      const { response, text } = await apiFetch({
        restPath: `short-urls/${item.shortCode}`,
        method: "DELETE",
      });
      if (response.ok) {
        toast.style = Toast.Style.Success;
        toast.title = `Deleted "${item.shortUrl}"!`;
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = `Failed to delete "${item.shortUrl}" (${response.statusText})!`;
        toast.message = text;
      }
      revalidate?.();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to delete "${item.shortUrl}"!`;
      toast.message = e?.toString();
    }
  }

  return confirmAlert({
    title: "Are you sure you want to delete this short link?",
    icon: { source: Icon.DeleteDocument, tintColor: Color.Red },

    primaryAction: {
      title: "Delete URL",
      style: Alert.ActionStyle.Destructive,
      onAction,
    },
  });
}
