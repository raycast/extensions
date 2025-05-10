import { List, ActionPanel, Action, showToast, Toast, Detail, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import rolimons, {
  RolimonsItemsResponse,
  RateLimitedResponse,
  RolimonsPlayer,
  RolimonsLeaderboard,
  RolimonsTradeAd,
} from "rolimons-fixed";

// Helper to map item IDs to names
const itemIdToName: Record<string, string> = {};

async function ensureItemIdToName() {
  if (Object.keys(itemIdToName).length === 0) {
    try {
      const data = await rolimons.items.getItems();
      if (!(data as RateLimitedResponse).rateLimited && (data as RolimonsItemsResponse).items) {
        const items = (data as RolimonsItemsResponse).items;
        for (const [id, arr] of Object.entries(items)) {
          itemIdToName[id] = arr[0] as string; // Item name is at index 0
        }
      } else if ((data as RateLimitedResponse).rateLimited) {
        console.warn("Failed to fetch item names for mapping: Rate limited by Rolimons API.");
      } else {
        console.warn("Failed to fetch item names for mapping: No items data received.");
      }
    } catch (error) {
      console.error("Error fetching item names for mapping:", error);
    }
  }
}

function formatItemList(itemIds: (number | string)[] | undefined): string {
  if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) return "-";
  return itemIds
    .map((id) => {
      const strId = String(id);
      return itemIdToName[strId] || strId; // Just return the ID without the "ID:" prefix
    })
    .join(", ");
}

function formatTags(tags: string[] | undefined): string {
  if (!tags || !Array.isArray(tags) || tags.length === 0) return "-";
  return tags.join(", ");
}

function formatPosted(unixTimestamp: string | number | undefined): string {
  if (unixTimestamp === undefined || unixTimestamp === null) return "-";
  const ts = typeof unixTimestamp === "string" ? parseInt(unixTimestamp, 10) : unixTimestamp;
  if (isNaN(ts)) {
    return String(unixTimestamp); // Return original if not a valid number
  }
  try {
    const date = new Date(ts * 1000);
    return date.toLocaleString(); // Or any other date format you prefer
  } catch (e) {
    console.error("Error formatting date:", e);
    return String(unixTimestamp); // Fallback to original string if date conversion fails
  }
}

// Define the structure of the parsed offer/request JSON
interface ParsedTradeOfferRequest {
  items?: (number | string)[];
  tags?: string[];
  robux?: number;
}

// Add type for Roblox thumbnail API response
interface RobloxThumbnailApiResponse {
  data?: Array<{
    state: string;
    imageUrl?: string;
  }>;
}

const SEARCH_TYPES = [
  { value: "item", name: "Item" },
  { value: "user", name: "User" },
  { value: "game", name: "Game" },
  { value: "group", name: "Group" },
  { value: "activity", name: "Activity" },
];

const demandMap: Record<string | number, string> = {
  "-1": "Unassigned",
  4: "Amazing",
  3: "High",
  2: "Normal",
  1: "Low",
  0: "Terrible",
};
const trendMap: Record<string | number, string> = {
  "-1": "Unassigned",
  3: "Raising",
  2: "Stable",
  1: "Unstable",
  0: "Lowering",
};

type FormatFieldType = "demand" | "trend" | "boolean";

function formatField(val: unknown, type?: FormatFieldType): string {
  if (type === "demand") return demandMap[val as string | number] ?? String(val);
  if (type === "trend") return trendMap[val as string | number] ?? String(val);
  if (type === "boolean") return val === 1 ? "Yes" : val === -1 ? "No" : String(val);
  if (val === -1 || val === "-1") return "Unset";
  if (typeof val === "number") return val.toLocaleString();
  if (typeof val === "boolean") return val ? "Yes" : "No";
  return String(val);
}

async function fetchRobloxThumbnail(assetId: string | number, size = 420): Promise<string | undefined> {
  try {
    const url = `https://thumbnails.roblox.com/v1/assets?assetIds=${assetId}&returnPolicy=PlaceHolder&size=${size}x${size}&format=Jpeg&isCircular=false`;
    const res = await fetch(url);
    const json = (await res.json()) as RobloxThumbnailApiResponse;
    if (
      json &&
      Array.isArray(json.data) &&
      json.data.length > 0 &&
      json.data[0].state === "Completed" &&
      json.data[0].imageUrl
    ) {
      return json.data[0].imageUrl;
    }
  } catch (error) {
    console.error("Error fetching Roblox thumbnail:", error);
  }
  return undefined;
}

function useRobloxThumbnail(assetId: string | number, fallback: string) {
  const [thumbnail, setThumbnail] = useState<string>(fallback);
  useEffect(() => {
    let mounted = true;
    fetchRobloxThumbnail(assetId).then((url) => {
      if (mounted && url) setThumbnail(url);
    });
    return () => {
      mounted = false;
    };
  }, [assetId, fallback]);
  return thumbnail;
}

// Define proper interfaces for the different data types
interface RolimonsItem {
  id: number;
  name: string;
  acronym: string;
  rap: number;
  value: number;
  demand: number;
  trend: number;
  projected: number;
  hyped: number;
  rare: number;
}

function ItemDetail({ item }: { item: RolimonsItem }) {
  const imageUrl = useRobloxThumbnail(item.id, `https://cdn.rolimons.com/item/${item.id}.png`);
  return (
    <Detail
      markdown={`![Item Image](${imageUrl})`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={item.name} />
          <Detail.Metadata.Label title="Acronym" text={item.acronym} />
          <Detail.Metadata.Label title="Value" text={formatField(item.value)} />
          <Detail.Metadata.Label title="RAP" text={formatField(item.rap)} />
          <Detail.Metadata.Label title="Demand" text={formatField(item.demand, "demand")} />
          <Detail.Metadata.Label title="Trend" text={formatField(item.trend, "trend")} />
          <Detail.Metadata.Label title="Projected" text={formatField(item.projected, "boolean")} />
          <Detail.Metadata.Label title="Hyped" text={formatField(item.hyped, "boolean")} />
          <Detail.Metadata.Label title="Rare" text={formatField(item.rare, "boolean")} />
          <Detail.Metadata.Link
            title="Rolimons Page"
            target={`https://www.rolimons.com/item/${item.id}`}
            text="Open in Browser"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            url={`https://www.rolimons.com/item/${item.id}`}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
        </ActionPanel>
      }
    />
  );
}

interface RolimonsUserDetail extends Partial<RolimonsPlayer> {
  username?: string;
  userid?: string;
}

function UserDetail({ user }: { user: RolimonsUserDetail }) {
  const userId = user.id || user.userid;
  const [avatar, setAvatar] = useState<string>(
    `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=420&height=420&format=png`,
  );
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const url = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`;
        const res = await fetch(url);
        const json = (await res.json()) as RobloxThumbnailApiResponse;
        if (
          json &&
          Array.isArray(json.data) &&
          json.data[0] &&
          json.data[0].state === "Completed" &&
          json.data[0].imageUrl &&
          mounted
        ) {
          setAvatar(json.data[0].imageUrl);
        }
      } catch (error) {
        console.error("Error fetching user avatar:", error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);
  return (
    <Detail
      markdown={`![User Avatar](${avatar})`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={user.name || user.username || ""} />
          <Detail.Metadata.Label title="Rank" text={user.rank || "-"} />
          <Detail.Metadata.Label title="Value" text={user.value ? formatField(user.value) : "-"} />
          <Detail.Metadata.Label title="RAP" text={user.rap ? formatField(user.rap) : "-"} />
          <Detail.Metadata.Link
            title="Rolimons Page"
            target={`https://www.rolimons.com/player/${userId}`}
            text="Open in Browser"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            url={`https://www.rolimons.com/player/${userId}`}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
        </ActionPanel>
      }
    />
  );
}

interface RolimonsGame {
  name?: string;
  creator_name?: string;
  players?: number;
  likes?: number;
  dislikes?: number;
  genre?: string;
  created?: string;
  favorites?: number;
  description?: string;
}

function GameDetail({ game, id }: { game: RolimonsGame; id: string }) {
  const imageUrl = useRobloxThumbnail(
    id,
    `https://www.roblox.com/asset-thumbnail/image?assetId=${id}&width=420&height=420&format=png`,
  );
  return (
    <Detail
      markdown={`![Game Thumbnail](${imageUrl})`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={game.name || `Game ${id}`} />
          <Detail.Metadata.Label title="Creator" text={game.creator_name || "Unknown Creator"} />
          <Detail.Metadata.Label title="Players" text={game.players ? String(game.players) : "-"} />
          <Detail.Metadata.Label title="Likes" text={game.likes ? String(game.likes) : "-"} />
          <Detail.Metadata.Label title="Dislikes" text={game.dislikes ? String(game.dislikes) : "-"} />
          <Detail.Metadata.Label title="Genre" text={game.genre || "-"} />
          <Detail.Metadata.Label title="Created" text={game.created || "-"} />
          <Detail.Metadata.Label title="Favorites" text={game.favorites ? String(game.favorites) : "-"} />
          <Detail.Metadata.Label title="Description" text={game.description || "-"} />
          <Detail.Metadata.Link
            title="Rolimons Page"
            target={`https://www.rolimons.com/game/${id}`}
            text="Open in Browser"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            url={`https://www.rolimons.com/game/${id}`}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
        </ActionPanel>
      }
    />
  );
}

interface RolimonsGroup {
  members?: string | number;
  created?: string;
  tracked_since?: string;
  past_day_growth?: string | number;
  last_scan?: string;
  owner?: string;
  owner_id?: string | number;
}

function GroupDetail({ group, id }: { group: RolimonsGroup; id: string }) {
  const imageUrl = `https://cdn.rolimons.com/group/${id}.png`;
  return (
    <Detail
      markdown={`![Group Icon](${imageUrl})`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Members" text={group.members ? String(group.members) : "-"} />
          <Detail.Metadata.Label title="Created" text={group.created || "-"} />
          <Detail.Metadata.Label title="Tracked Since" text={group.tracked_since || "-"} />
          <Detail.Metadata.Label
            title="Past Day Growth"
            text={group.past_day_growth ? String(group.past_day_growth) : "-"}
          />
          <Detail.Metadata.Label title="Last Scan" text={group.last_scan || "-"} />
          <Detail.Metadata.Link
            title="Rolimons Page"
            target={`https://www.rolimons.com/group/${id}`}
            text="Open in Browser"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            url={`https://www.rolimons.com/group/${id}`}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
        </ActionPanel>
      }
    />
  );
}

function TradeDetail({ trade }: { trade: RolimonsTradeAd }) {
  const [avatar, setAvatar] = useState<string>(
    `https://www.roblox.com/headshot-thumbnail/image?userId=${trade.userid}&width=420&height=420&format=png`,
  );
  const [offerItemsText, setOfferItemsText] = useState<string>("Loading items...");
  const [requestItemsText, setRequestItemsText] = useState<string>("Loading items...");
  const [parsedOffer, setParsedOffer] = useState<ParsedTradeOfferRequest | null>(null);
  const [parsedRequest, setParsedRequest] = useState<ParsedTradeOfferRequest | null>(null);

  useEffect(() => {
    let mounted = true;

    // Parse offer and request JSON strings
    try {
      if (trade.offer && typeof trade.offer === "string") {
        setParsedOffer(JSON.parse(trade.offer) as ParsedTradeOfferRequest);
      } else if (typeof trade.offer === "object") {
        // Already an object from API
        setParsedOffer(trade.offer as ParsedTradeOfferRequest);
      }
      if (trade.request && typeof trade.request === "string") {
        setParsedRequest(JSON.parse(trade.request) as ParsedTradeOfferRequest);
      } else if (typeof trade.request === "object") {
        // Already an object from API
        setParsedRequest(trade.request as ParsedTradeOfferRequest);
      }
    } catch (e) {
      console.error("Failed to parse trade offer/request JSON:", e);
      if (mounted) {
        setOfferItemsText("Invalid offer data");
        setRequestItemsText("Invalid request data");
      }
    }

    // Fetch avatar
    (async () => {
      try {
        const url = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${trade.userid}&size=420x420&format=Png&isCircular=false`;
        const res = await fetch(url);
        const json = (await res.json()) as RobloxThumbnailApiResponse;
        if (
          mounted &&
          json &&
          Array.isArray(json.data) &&
          json.data[0] &&
          json.data[0].state === "Completed" &&
          json.data[0].imageUrl
        ) {
          setAvatar(json.data[0].imageUrl);
        }
      } catch (e) {
        console.error("Failed to fetch avatar for trade detail:", e);
      }
    })();

    // Format items (now depends on parsedOffer/Request)
    (async () => {
      if (!parsedOffer && !parsedRequest) return; // Wait for parsing
      try {
        await ensureItemIdToName();
        if (mounted) {
          if (parsedOffer) setOfferItemsText(formatItemList(parsedOffer.items));
          else setOfferItemsText("-");
          if (parsedRequest) setRequestItemsText(formatItemList(parsedRequest.items));
          else setRequestItemsText("-");
        }
      } catch (e) {
        console.error("Failed to format items for trade detail:", e);
        if (mounted) {
          setOfferItemsText("Error loading item names");
          setRequestItemsText("Error loading item names");
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [trade, parsedOffer, parsedRequest]); // Add parsedOffer/Request to dependencies

  const offerTagsText = parsedOffer ? formatTags(parsedOffer.tags) : "-";
  const requestTagsText = parsedRequest ? formatTags(parsedRequest.tags) : "-";
  const offerRobuxText = parsedOffer?.robux ? `${parsedOffer.robux.toLocaleString()} Robux` : "";
  const requestRobuxText = parsedRequest?.robux ? `${parsedRequest.robux.toLocaleString()} Robux` : "";
  const postedTimeText = formatPosted(trade.posted);
  const username = trade.username || `User ${trade.userid}`;

  return (
    <Detail
      markdown={`![User Avatar](${avatar})`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="User" text={username} />
          <Detail.Metadata.Label title="Posted" text={postedTimeText} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Offering Items" text={offerItemsText} />
          {offerRobuxText && <Detail.Metadata.Label title="Offering Robux" text={offerRobuxText} />}
          {parsedOffer?.tags && parsedOffer.tags.length > 0 && (
            <Detail.Metadata.Label title="Offering Tags" text={offerTagsText} />
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Requesting Items" text={requestItemsText} />
          {requestRobuxText && <Detail.Metadata.Label title="Requesting Robux" text={requestRobuxText} />}
          {parsedRequest?.tags && parsedRequest.tags.length > 0 && (
            <Detail.Metadata.Label title="Requesting Tags" text={requestTagsText} />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            url={`https://www.rolimons.com/player/${trade.userid}`}
            title="Open in Browser"
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
        </ActionPanel>
      }
    />
  );
}

type SearchType = "item" | "user" | "game" | "group" | "activity";

export default function Command() {
  const { push } = useNavigation();
  const [searchType, setSearchType] = useState<SearchType>("item");
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<
    (RolimonsItem | RolimonsPlayer | RolimonsGame | RolimonsGroup | RolimonsTradeAd)[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  useEffect(() => {
    setRateLimited(false);
    if (!searchText && searchType !== "activity") {
      setResults([]);
      return;
    }
    setLoading(true);
    async function fetchData() {
      try {
        if (searchType === "item") {
          const data = await rolimons.items.getItems();
          if ((data as RateLimitedResponse).rateLimited) {
            setRateLimited(true);
            setResults([]);
            setLoading(false);
            return;
          }
          if (!data || !(data as RolimonsItemsResponse).items) {
            setResults([]);
            setLoading(false);
            return;
          }
          const allItems = Object.entries((data as RolimonsItemsResponse).items).map(([id, arr]) => {
            const a = arr as unknown[];
            return {
              id: Number(id),
              name: a[0] as string,
              acronym: a[1] as string,
              rap: a[2] as number,
              value: a[3] as number,
              demand: a[5] as number,
              trend: a[6] as number,
              projected: a[7] as number,
              hyped: a[8] as number,
              rare: a[9] as number,
            } as RolimonsItem;
          });
          setResults(
            searchText
              ? allItems.filter(
                  (item) =>
                    item.name.toLowerCase().includes(searchText.toLowerCase()) ||
                    (item.acronym && item.acronym.toLowerCase().includes(searchText.toLowerCase())),
                )
              : [],
          );
        } else if (searchType === "user") {
          let userResult: RolimonsPlayer | RateLimitedResponse | Record<string, never> | null = null;
          if (/^\d+$/.test(searchText)) {
            try {
              userResult = await rolimons.players.getPlayer(searchText);
              if ((userResult as RateLimitedResponse).rateLimited) {
                setRateLimited(true);
                setResults([]);
                setLoading(false);
                return;
              }
              if (!userResult || Object.keys(userResult).length === 0) {
                setResults([]);
                setLoading(false);
                return;
              }
              // Ensure we're dealing with a proper player object
              const player = userResult as RolimonsPlayer;
              setResults([player]);
            } catch (error) {
              console.error("Error fetching user data:", error);
              setResults([]);
            }
          } else {
            let found: RolimonsPlayer[] = [];
            for (let page = 1; page <= 20; page++) {
              const leaderboard = await rolimons.players.getLeaderboard(page);
              if ((leaderboard as RateLimitedResponse).rateLimited) {
                setRateLimited(true);
                setResults([]);
                setLoading(false);
                return;
              }
              if (!Array.isArray(leaderboard)) break;
              found = (leaderboard as RolimonsLeaderboard).filter((plr) =>
                plr.name.toLowerCase().includes(searchText.toLowerCase()),
              );
              if (found.length > 0) break;
            }
            setResults(found);
          }
        } else if (searchType === "game") {
          if (/^\d+$/.test(searchText)) {
            try {
              const game = await rolimons.games.getInfo(searchText);
              if ((game as RateLimitedResponse).rateLimited) {
                setRateLimited(true);
                setResults([]);
                setLoading(false);
                return;
              }
              if (!game || Object.keys(game).length === 0) {
                setResults([]);
                setLoading(false);
                return;
              }
              setResults([game as RolimonsGame]);
            } catch (error) {
              console.error("Error fetching game data:", error);
              setResults([]);
            }
          } else {
            setResults([]);
          }
        } else if (searchType === "group") {
          if (/^\d+$/.test(searchText)) {
            try {
              const group = await rolimons.groups.getInfo(searchText);
              if ((group as RateLimitedResponse).rateLimited) {
                setRateLimited(true);
                setResults([]);
                setLoading(false);
                return;
              }
              if (!group || Object.keys(group).length === 0) {
                setResults([]);
                setLoading(false);
                return;
              }
              setResults([group as RolimonsGroup]);
            } catch (error) {
              console.error("Error fetching group data:", error);
              setResults([]);
            }
          } else {
            setResults([]);
          }
        } else if (searchType === "activity") {
          const trades = await rolimons.activity.getTradeAds();
          if ((trades as RateLimitedResponse).rateLimited) {
            setRateLimited(true);
            setResults([]);
            setLoading(false);
            return;
          }
          if (!Array.isArray(trades)) {
            setResults([]);
            setLoading(false);
            return;
          }

          // Load the item ID to name mapping before displaying trades
          await ensureItemIdToName();

          setResults(trades as RolimonsTradeAd[]);
        }
      } catch (e) {
        showToast({ style: Toast.Style.Failure, title: "Error", message: String(e) });
        setResults([]);
      }
      setLoading(false);
    }
    fetchData();
  }, [searchText, searchType]);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={`Search for a Roblox ${searchType}...`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Search Type"
          onChange={(value) => setSearchType(value as SearchType)}
          value={searchType}
        >
          {SEARCH_TYPES.map((type) => (
            <List.Dropdown.Item key={type.value} title={type.name} value={type.value} />
          ))}
        </List.Dropdown>
      }
      onSearchTextChange={setSearchText}
      searchText={searchText}
    >
      {rateLimited && (
        <List.EmptyView
          title="Rate Limited"
          description="You are being rate limited by the API. Please wait a few minutes and try again."
        />
      )}
      {!rateLimited && searchType === "item" && results.length === 0 && searchText.length > 0 && (
        <List.EmptyView title="No Item Found" description="Try searching for a different item name or acronym." />
      )}
      {!rateLimited && searchType === "user" && results.length === 0 && searchText.length > 0 && (
        <List.EmptyView title="No User Found" description="Try searching for a different username or user ID." />
      )}
      {!rateLimited && searchType === "game" && results.length === 0 && searchText.length > 0 && (
        <List.EmptyView title="No Game Found" description="Try searching for a different game ID." />
      )}
      {!rateLimited && searchType === "group" && results.length === 0 && searchText.length > 0 && (
        <List.EmptyView title="No Group Found" description="Try searching for a different group ID." />
      )}
      {!rateLimited && searchType === "activity" && results.length === 0 && (
        <List.EmptyView title="No Activity Found" description="No recent trade ads found." />
      )}
      {!rateLimited &&
        searchType === "item" &&
        results.map((item) => {
          const typedItem = item as RolimonsItem;
          return (
            <List.Item
              key={typedItem.id}
              title={typedItem.name}
              subtitle={formatField(typedItem.acronym)}
              accessories={[
                { text: `Value: ${formatField(typedItem.value)}` },
                { text: `RAP: ${formatField(typedItem.rap)}` },
                { text: `Demand: ${formatField(typedItem.demand, "demand")}` },
                { text: `Trend: ${formatField(typedItem.trend, "trend")}` },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Open"
                    onAction={() => push(<ItemDetail item={typedItem} />)}
                    shortcut={{ modifiers: [], key: "return" }}
                  />
                  <Action.OpenInBrowser
                    url={`https://www.rolimons.com/item/${typedItem.id}`}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      {!rateLimited &&
        searchType === "user" &&
        results.map((user) => {
          const typedUser = user as RolimonsUserDetail;
          return (
            <List.Item
              key={typedUser.id || typedUser.userid || typedUser.name}
              title={typedUser.name || typedUser.username || ""}
              subtitle={typedUser.rank ? `Rank: ${typedUser.rank}` : undefined}
              accessories={[
                { text: typedUser.value ? `Value: ${formatField(typedUser.value)}` : undefined },
                { text: typedUser.rap ? `RAP: ${formatField(typedUser.rap)}` : undefined },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Open"
                    onAction={() => push(<UserDetail user={typedUser} />)}
                    shortcut={{ modifiers: [], key: "return" }}
                  />
                  <Action.OpenInBrowser
                    url={`https://www.rolimons.com/player/${typedUser.id || typedUser.userid}`}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      {!rateLimited &&
        searchType === "game" &&
        results.map((game, idx) => {
          const typedGame = game as RolimonsGame;
          return (
            <List.Item
              key={typedGame.name || idx}
              title={typedGame.name || `Game ${searchText}`}
              subtitle={typedGame.creator_name || "Unknown Creator"}
              accessories={[
                { text: typedGame.players ? `Players: ${formatField(typedGame.players)}` : undefined },
                { text: typedGame.likes ? `Likes: ${formatField(typedGame.likes)}` : undefined },
                { text: typedGame.dislikes ? `Dislikes: ${formatField(typedGame.dislikes)}` : undefined },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Open"
                    onAction={() => push(<GameDetail game={typedGame} id={searchText} />)}
                    shortcut={{ modifiers: [], key: "return" }}
                  />
                  <Action.OpenInBrowser
                    url={`https://www.rolimons.com/game/${searchText}`}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      {!rateLimited &&
        searchType === "group" &&
        results.map((group, idx) => {
          const typedGroup = group as RolimonsGroup;
          return (
            <List.Item
              key={typedGroup.owner_id || idx}
              title={`Owner: ${typedGroup.owner || "Unknown"}`}
              subtitle={`Members: ${typedGroup.members || "-"}`}
              accessories={[
                { text: typedGroup.created ? `Created: ${formatField(typedGroup.created)}` : undefined },
                { text: typedGroup.past_day_growth ? `Growth: ${formatField(typedGroup.past_day_growth)}` : undefined },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Open"
                    onAction={() => push(<GroupDetail group={typedGroup} id={searchText} />)}
                    shortcut={{ modifiers: [], key: "return" }}
                  />
                  <Action.OpenInBrowser
                    url={`https://www.rolimons.com/group/${searchText}`}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      {!rateLimited &&
        searchType === "activity" &&
        results.map((trade, idx) => {
          const typedTrade = trade as RolimonsTradeAd;
          // Parse offer and request if they're strings
          let parsedOffer: ParsedTradeOfferRequest | null = null;
          let parsedRequest: ParsedTradeOfferRequest | null = null;

          try {
            if (typedTrade.offer && typeof typedTrade.offer === "string") {
              parsedOffer = JSON.parse(typedTrade.offer) as ParsedTradeOfferRequest;
            } else if (typeof typedTrade.offer === "object") {
              parsedOffer = typedTrade.offer as ParsedTradeOfferRequest;
            }

            if (typedTrade.request && typeof typedTrade.request === "string") {
              parsedRequest = JSON.parse(typedTrade.request) as ParsedTradeOfferRequest;
            } else if (typeof typedTrade.request === "object") {
              parsedRequest = typedTrade.request as ParsedTradeOfferRequest;
            }
          } catch (e) {
            console.error("Failed to parse trade offer/request JSON in list view:", e);
          }

          // Format the data for the new layout
          const username = typedTrade.username || `User ${typedTrade.userid}`;
          const tags = parsedOffer?.tags && parsedOffer.tags.length > 0 ? `(${formatTags(parsedOffer.tags)})` : "";

          // Format items with direct ID display if no name is available
          function formatTradeItems(items: (number | string)[] | undefined): string {
            if (!items || !Array.isArray(items) || items.length === 0) return "-";
            return items
              .map((id) => {
                const strId = String(id);
                return itemIdToName[strId] ? itemIdToName[strId] : `ID: ${strId}`;
              })
              .join(", ");
          }

          // Format offer and request items
          const offerItems =
            parsedOffer?.items && parsedOffer.items.length > 0 ? formatTradeItems(parsedOffer.items) : "No items";

          const requestItems =
            parsedRequest?.items && parsedRequest.items.length > 0 ? formatTradeItems(parsedRequest.items) : "No items";

          // Add Robux if present
          const offerRobux = parsedOffer?.robux ? `+${parsedOffer.robux.toLocaleString()} R$` : "";
          const requestRobux = parsedRequest?.robux ? `+${parsedRequest.robux.toLocaleString()} R$` : "";

          // Format the title and subtitle as requested
          const title = `${username} ${tags}`;
          const subtitle = `${offerItems}${offerRobux ? ` ${offerRobux}` : ""} VS ${requestItems}${requestRobux ? ` ${requestRobux}` : ""}`;

          return (
            <List.Item
              key={typedTrade.userid || idx}
              title={title}
              subtitle={subtitle}
              accessories={[{ text: `Posted: ${formatPosted(typedTrade.posted)}` }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Open"
                    onAction={() => push(<TradeDetail trade={typedTrade} />)}
                    shortcut={{ modifiers: [], key: "return" }}
                  />
                  <Action.OpenInBrowser
                    url={`https://www.rolimons.com/player/${typedTrade.userid}`}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
