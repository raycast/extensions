import { List, Detail, Grid, ActionPanel, Action, showToast, Toast, Color, Icon } from "@raycast/api";
import { usePromise, useFetch, useLocalStorage } from "@raycast/utils";
import { useMemo, useState, type ReactElement } from "react";
import {
  Card,
  FEEDBACK_URL,
  SAVED_CARDS_KEY,
  ScryfallSearchResponse,
  getCardImageUri,
  getTaggerUrl,
  getEdhrecUrl,
  copyCardImage,
} from "./shared";
import { COLLECTION_IDS_KEY, COLLECTION_NAMES_KEY } from "./collection";

// ─── Tagger API ───────────────────────────────────────────────────────────────

interface Tagging {
  tag: {
    name: string;
    type: "ORACLE_CARD_TAG" | "ILLUSTRATION_TAG" | string;
  };
}

interface TaggerResponse {
  data?: { card?: { taggings: Tagging[] } };
  errors?: Array<{ message: string }>;
}

async function fetchCardTags(set: string, collectorNumber: string): Promise<Tagging[]> {
  const cardUrl = `https://tagger.scryfall.com/card/${set}/${collectorNumber}`;

  console.log(`[Scrycast] Fetching tagger page for ${set}/${collectorNumber}`);
  const pageResponse = await fetch(cardUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!pageResponse.ok) {
    throw new Error(`Tagger page unavailable (${pageResponse.status})`);
  }

  const html = await pageResponse.text();
  const csrfMatch = html.match(/name="csrf-token" content="([^"]+)"/);
  if (!csrfMatch) throw new Error("Could not find CSRF token on tagger page");

  const csrfToken = csrfMatch[1];
  const setCookies: string[] =
    typeof (pageResponse.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie === "function"
      ? (pageResponse.headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
      : [pageResponse.headers.get("set-cookie") ?? ""];

  const cookieHeader = setCookies
    .filter(Boolean)
    .map((c) => c.split(";")[0])
    .join("; ");

  const gqlResponse = await fetch("https://tagger.scryfall.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
      Cookie: cookieHeader,
      Origin: "https://tagger.scryfall.com",
      Referer: cardUrl,
    },
    body: JSON.stringify({
      query: `query {
        card: cardBySet(set: ${JSON.stringify(set)}, number: ${JSON.stringify(collectorNumber)}) {
          taggings { tag { name type } }
        }
      }`,
    }),
  });

  if (!gqlResponse.ok) {
    const body = await gqlResponse.text();
    console.error(`[Scrycast] GraphQL ${gqlResponse.status}:`, body);
    throw new Error(`GraphQL request failed (${gqlResponse.status})`);
  }

  const result = (await gqlResponse.json()) as TaggerResponse;
  if (result.errors?.length) throw new Error(result.errors[0]?.message ?? "GraphQL error");

  const taggings: Tagging[] = result.data?.card?.taggings ?? [];
  console.log(`[Scrycast] ${taggings.length} tags returned for ${set}/${collectorNumber}`);
  return taggings;
}

// ─── Card Tags View ───────────────────────────────────────────────────────────

function tagScryfallSearchUrl(type: string, name: string): string {
  if (type === "ORACLE_CARD_TAG") return `https://scryfall.com/search?q=oracletag%3A"${encodeURIComponent(name)}"`;
  if (type === "ILLUSTRATION_TAG") return `https://scryfall.com/search?q=arttag%3A"${encodeURIComponent(name)}"`;
  return `https://scryfall.com/search?q="${encodeURIComponent(name)}"`;
}

export interface CardTagsViewProps {
  card: Card;
  // When provided, "Search This Tag" pushes in-app; otherwise opens Scryfall in browser.
  searchTagTarget?: (query: string) => ReactElement;
}

function tagSearchQuery(type: string, name: string): string {
  if (type === "ORACLE_CARD_TAG") return `oracletag:"${name}"`;
  if (type === "ILLUSTRATION_TAG") return `arttag:"${name}"`;
  return `"${name}"`;
}

export function CardTagsView({ card, searchTagTarget }: CardTagsViewProps) {
  const imageUri = getCardImageUri(card, "png");

  const {
    isLoading,
    data: taggings,
    error,
  } = usePromise(() => fetchCardTags(card.set, card.collector_number), [], {
    onError: (err) => {
      console.error("[Scrycast] fetchCardTags failed:", err.message, "\nStack:", err.stack);
      showToast({ style: Toast.Style.Failure, title: "Failed to load tags", message: err.message });
    },
  });

  const oracleTags = (taggings ?? []).filter((t) => t.tag.type === "ORACLE_CARD_TAG");
  const artTags = (taggings ?? []).filter((t) => t.tag.type === "ILLUSTRATION_TAG");
  const otherTags = (taggings ?? []).filter(
    (t) => t.tag.type !== "ORACLE_CARD_TAG" && t.tag.type !== "ILLUSTRATION_TAG"
  );

  const cardDetail = <List.Item.Detail markdown={`<img src="${imageUri}" width="366" />`} />;

  function tagItem(t: Tagging, color: Color) {
    const query = tagSearchQuery(t.tag.type, t.tag.name);

    return (
      <List.Item
        key={t.tag.name}
        title={t.tag.name}
        icon={{ source: Icon.Tag, tintColor: color }}
        detail={cardDetail}
        actions={
          <ActionPanel>
            {searchTagTarget ? (
              <>
                <Action.Push title="Search This Tag" icon={Icon.MagnifyingGlass} target={searchTagTarget(query)} />
                <Action.OpenInBrowser
                  title="Search This Tag on Scryfall"
                  icon={{ source: Icon.Globe, tintColor: Color.Blue }}
                  url={tagScryfallSearchUrl(t.tag.type, t.tag.name)}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                />
              </>
            ) : (
              <Action.OpenInBrowser
                title="Search This Tag on Scryfall"
                icon={Icon.MagnifyingGlass}
                url={tagScryfallSearchUrl(t.tag.type, t.tag.name)}
              />
            )}
            <Action.OpenInBrowser
              title="Open in Scryfall Tagger"
              url={getTaggerUrl(card)}
              icon={{ source: Icon.Tag, tintColor: Color.Orange }}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
            />
            <ActionPanel.Section title="Feedback">
              <Action.OpenInBrowser title="Submit Bug or Feature Request" url={FEEDBACK_URL} icon={Icon.Bug} />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List navigationTitle={`${card.name} — Tags`} isLoading={isLoading} isShowingDetail>
      {!isLoading && error && (
        <List.EmptyView icon={Icon.ExclamationMark} title="Could Not Load Tags" description={error.message} />
      )}
      {!isLoading && !error && taggings?.length === 0 && (
        <List.EmptyView icon="🧙" title="No Tags Found" description="This card has no tagger entries yet." />
      )}
      {oracleTags.length > 0 && (
        <List.Section title="Oracle Tags">{oracleTags.map((t) => tagItem(t, Color.Blue))}</List.Section>
      )}
      {artTags.length > 0 && (
        <List.Section title="Art Tags">{artTags.map((t) => tagItem(t, Color.Purple))}</List.Section>
      )}
      {otherTags.length > 0 && (
        <List.Section title="Other Tags">{otherTags.map((t) => tagItem(t, Color.SecondaryText))}</List.Section>
      )}
    </List>
  );
}

// ─── Prints View ──────────────────────────────────────────────────────────────

export interface PrintsViewProps {
  card: Card;
  searchTagTarget?: (query: string) => ReactElement;
}

export function PrintsView({ card, searchTagTarget }: PrintsViewProps) {
  const printsUrl =
    card.prints_search_uri ??
    `https://api.scryfall.com/cards/search?q=${encodeURIComponent(`!"${card.name}"`)}&unique=prints&order=released`;

  const { isLoading, data } = useFetch<ScryfallSearchResponse>(printsUrl, {
    onError: (err) => {
      showToast({ style: Toast.Style.Failure, title: "Failed to load prints", message: err.message });
    },
  });

  const { value: savedCards, setValue: setSavedCards } = useLocalStorage<Card[]>(SAVED_CARDS_KEY, []);
  const savedCardIds = useMemo(() => new Set((savedCards ?? []).map((c) => c.id)), [savedCards]);
  const { value: collectionIds } = useLocalStorage<string[]>(COLLECTION_IDS_KEY, []);
  const { value: collectionNames } = useLocalStorage<string[]>(COLLECTION_NAMES_KEY, []);
  const collectionIdSet = useMemo(() => new Set(collectionIds ?? []), [collectionIds]);
  const collectionNameSet = useMemo(() => new Set(collectionNames ?? []), [collectionNames]);

  function toggleSave(print: Card) {
    if (savedCardIds.has(print.id)) {
      setSavedCards((savedCards ?? []).filter((c) => c.id !== print.id));
      showToast({ style: Toast.Style.Success, title: "Removed from Saved" });
    } else {
      setSavedCards([...(savedCards ?? []), print]);
      showToast({ style: Toast.Style.Success, title: "Card Saved" });
    }
  }

  const prints = data?.data ?? [];

  return (
    <Grid
      columns={3}
      aspectRatio="2/3"
      fit={Grid.Fit.Fill}
      inset={Grid.Inset.Small}
      isLoading={isLoading}
      navigationTitle={`${card.name} — All Prints`}
    >
      {!isLoading && prints.length === 0 ? (
        <Grid.EmptyView icon="🧙" title="No Prints Found" description="Could not find any prints for this card." />
      ) : (
        <Grid.Section title={`${prints.length} print${prints.length !== 1 ? "s" : ""}`}>
          {prints.map((print) => {
            const imageUri = getCardImageUri(print);
            const isSaved = savedCardIds.has(print.id);
            const exactMatch = collectionIdSet.has(print.id);
            const nameMatch = !exactMatch && collectionNameSet.has(print.name);
            return (
              <Grid.Item
                key={print.id}
                content={{ source: imageUri }}
                title={`${isSaved ? "🔖 " : ""}${exactMatch ? "✅ " : nameMatch ? "☑️ " : ""}${print.set_name ?? print.set.toUpperCase()}`}
                subtitle={`#${print.collector_number}`}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title={`${print.set_name} #${print.collector_number}`}>
                      <Action.Push
                        title="Show Card Details"
                        target={<CardDetailView card={print} searchTagTarget={searchTagTarget} />}
                        icon={Icon.Eye}
                      />
                      <Action.OpenInBrowser
                        title="Open in Scryfall"
                        url={print.scryfall_uri}
                        icon={{ source: Icon.Globe, tintColor: Color.Blue }}
                        shortcut={{ modifiers: ["cmd"], key: "return" }}
                      />
                      <Action.OpenInBrowser
                        title="Open in Edhrec" // eslint-disable-line @raycast/prefer-title-case
                        url={getEdhrecUrl(print.name)}
                        icon={{ source: Icon.Person, tintColor: Color.Green }}
                        shortcut={{ modifiers: ["cmd", "ctrl"], key: "return" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Card Name"
                        content={print.name}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                        icon={Icon.Clipboard}
                      />
                      <Action
                        title="Copy Card Image"
                        icon={Icon.Image}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                        onAction={async () => {
                          const toast = await showToast({ style: Toast.Style.Animated, title: "Copying image…" });
                          try {
                            await copyCardImage(imageUri);
                            toast.style = Toast.Style.Success;
                            toast.title = "Image copied";
                          } catch (err) {
                            toast.style = Toast.Style.Failure;
                            toast.title = "Failed to copy image";
                            toast.message = (err as Error).message;
                          }
                        }}
                      />
                      <Action
                        title={isSaved ? "Remove from Bookmarks" : "Bookmark Card"}
                        icon={isSaved ? Icon.StarDisabled : Icon.Star}
                        shortcut={{ modifiers: ["cmd"], key: "b" }}
                        onAction={() => toggleSave(print)}
                      />
                      <Action.OpenInBrowser
                        title="Open in Scryfall Tagger"
                        url={getTaggerUrl(print)}
                        icon={{ source: Icon.Tag, tintColor: Color.Orange }}
                        shortcut={{ modifiers: ["cmd"], key: "t" }}
                      />
                      <Action.Push
                        title="Show Tags"
                        target={<CardTagsView card={print} searchTagTarget={searchTagTarget} />}
                        icon={{ source: Icon.Tag, tintColor: Color.Purple }}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Feedback">
                      <Action.OpenInBrowser title="Submit Bug or Feature Request" url={FEEDBACK_URL} icon={Icon.Bug} />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </Grid.Section>
      )}
    </Grid>
  );
}

// ─── Card Detail View ─────────────────────────────────────────────────────────

export interface CardDetailViewProps {
  card: Card;
  searchTagTarget?: (query: string) => ReactElement;
}

export function CardDetailView({ card, searchTagTarget }: CardDetailViewProps) {
  const isDFC = (card.card_faces?.length ?? 0) >= 2;
  const [faceIndex, setFaceIndex] = useState(0);

  const activeFace = isDFC ? card.card_faces![faceIndex] : null;

  const imageUri = activeFace?.image_uris?.png ?? getCardImageUri(card, "png");
  const oracleText = activeFace?.oracle_text ?? card.oracle_text;
  const flavorText = activeFace?.flavor_text ?? card.flavor_text;
  const manaCost = activeFace?.mana_cost ?? card.mana_cost;
  const displayName = activeFace ? `${card.name} (${activeFace.name})` : card.name;

  const markdown = `<img src="${imageUri}" width="504" />`;
  return (
    <Detail
      navigationTitle={displayName}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={displayName} />
          {card.type_line && <Detail.Metadata.Label title="Type" text={card.type_line} />}
          {manaCost && <Detail.Metadata.Label title="Mana Cost" text={manaCost} />}
          {oracleText && <Detail.Metadata.Label title="Oracle Text" text={oracleText} />}
          {flavorText && <Detail.Metadata.Label title="Flavor Text" text={flavorText} />}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Scryfall" target={card.scryfall_uri} text="View on Scryfall" />
          <Detail.Metadata.Link title="EDHRec" target={getEdhrecUrl(card.name)} text="View on EDHRec" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {isDFC && (
            <Action
              title={`Flip to ${card.card_faces![faceIndex === 0 ? 1 : 0].name}`}
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={() => setFaceIndex((i) => (i === 0 ? 1 : 0))}
            />
          )}
          <Action.OpenInBrowser
            title="Open in Scryfall"
            url={card.scryfall_uri}
            icon={{ source: Icon.Globe, tintColor: Color.Blue }}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
          <Action.OpenInBrowser
            title="Open in Edhrec" // eslint-disable-line @raycast/prefer-title-case
            url={getEdhrecUrl(card.name)}
            icon={{ source: Icon.Person, tintColor: Color.Green }}
            shortcut={{ modifiers: ["cmd", "ctrl"], key: "return" }}
          />
          <Action.CopyToClipboard
            title="Copy Card Name"
            content={card.name}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            icon={Icon.Clipboard}
          />
          <Action.OpenInBrowser
            title="Open in Scryfall Tagger"
            url={getTaggerUrl(card)}
            icon={{ source: Icon.Tag, tintColor: Color.Orange }}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
          />
          <Action.Push
            title="Show Tags"
            target={<CardTagsView card={card} searchTagTarget={searchTagTarget} />}
            icon={{ source: Icon.Tag, tintColor: Color.Purple }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
          />
          <ActionPanel.Section title="Feedback">
            <Action.OpenInBrowser title="Submit Bug or Feature Request" url={FEEDBACK_URL} icon={Icon.Bug} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
