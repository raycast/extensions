import {
  Grid,
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Color,
  Alert,
  confirmAlert,
  useNavigation,
} from "@raycast/api";
import { useLocalStorage, usePromise } from "@raycast/utils";
import { useState, useEffect } from "react";
import { Card, getCardImageUri, getEdhrecUrl, getTaggerUrl, copyCardImage, isFlippable, FEEDBACK_URL } from "./shared";
import { CardDetailView, CardTagsView, PrintsView } from "./card-views";

const SAVED_DECKS_KEY = "savedDecks";

type DeckSource = "moxfield" | "archidekt" | "text";

interface SavedDeck {
  id: string;
  name: string;
  url: string;
  source: DeckSource;
  format?: string;
  commanderName?: string;
  commanderImageUri?: string;
  deckListText?: string;
  cards?: DeckCard[];
  addedAt: number;
  updatedAt?: number;
}

type DeckSection = "commander" | "companion" | "mainboard" | "sideboard" | "other";

interface DeckCard {
  card: Card;
  quantity: number;
  section: DeckSection;
}

interface FetchedDeck {
  name: string;
  format?: string;
  commanderName?: string;
  commanderImageUri?: string;
  cards: DeckCard[];
}

// ─── URL Parsing ───────────────────────────────────────────────────────────────

function parseDeckUrl(url: string): { source: DeckSource; id: string } | null {
  const moxfield = url.match(/moxfield\.com\/decks\/([A-Za-z0-9_-]+)/);
  if (moxfield) return { source: "moxfield", id: moxfield[1] };
  const archidekt = url.match(/archidekt\.com\/decks\/(\d+)/);
  if (archidekt) return { source: "archidekt", id: archidekt[1] };
  return null;
}

// ─── Moxfield ──────────────────────────────────────────────────────────────────

interface MoxfieldCardEntry {
  quantity: number;
  card: Card;
}

interface MoxfieldBoard {
  count: number;
  cards: Record<string, MoxfieldCardEntry>;
}

interface MoxfieldDeckResponse {
  name: string;
  format?: string;
  boards: {
    commanders?: MoxfieldBoard;
    companions?: MoxfieldBoard;
    mainboard?: MoxfieldBoard;
    sideboard?: MoxfieldBoard;
  };
}

async function fetchMoxfieldDeck(id: string): Promise<FetchedDeck> {
  const res = await fetch(`https://api2.moxfield.com/v3/decks/all/${id}`, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`Moxfield error ${res.status}`);
  const data = (await res.json()) as MoxfieldDeckResponse;

  const cards: DeckCard[] = [];
  const addBoard = (board: MoxfieldBoard | undefined, section: DeckSection) => {
    for (const entry of Object.values(board?.cards ?? {}))
      cards.push({ card: entry.card, quantity: entry.quantity, section });
  };
  addBoard(data.boards?.commanders, "commander");
  addBoard(data.boards?.companions, "companion");
  addBoard(data.boards?.mainboard, "mainboard");
  addBoard(data.boards?.sideboard, "sideboard");

  const firstCommander = Object.values(data.boards?.commanders?.cards ?? {})[0];
  return {
    name: data.name,
    format: data.format,
    commanderName: firstCommander?.card.name,
    commanderImageUri: firstCommander ? getCardImageUri(firstCommander.card, "png") : undefined,
    cards,
  };
}

// ─── Archidekt ─────────────────────────────────────────────────────────────────

interface ArchidektCardEntry {
  quantity: number;
  categories: string[];
  card: { uid: string };
}

interface ArchidektDeckResponse {
  name: string;
  deckFormat: number;
  cards: ArchidektCardEntry[];
}

const ARCHIDEKT_FORMATS: Record<number, string> = {
  1: "standard",
  2: "modern",
  3: "commander",
  4: "legacy",
  5: "vintage",
  6: "pauper",
  7: "pioneer",
  8: "historic",
  11: "oathbreaker",
};

async function fetchScryfallBatch(ids: string[]): Promise<Map<string, Card>> {
  const map = new Map<string, Card>();
  for (let i = 0; i < ids.length; i += 75) {
    const chunk = ids.slice(i, i + 75);
    const res = await fetch("https://api.scryfall.com/cards/collection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifiers: chunk.map((id) => ({ id })) }),
    });
    if (!res.ok) throw new Error(`Scryfall collection error ${res.status}`);
    const data = (await res.json()) as { data: Card[] };
    for (const card of data.data) map.set(card.id, card);
  }
  return map;
}

async function fetchArchidektDeck(id: string): Promise<FetchedDeck> {
  const res = await fetch(`https://archidekt.com/api/decks/${id}/`, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`Archidekt error ${res.status}`);
  const data = (await res.json()) as ArchidektDeckResponse;

  const scryfallIds = [...new Set(data.cards.map((c) => c.card.uid))];
  const cardMap = await fetchScryfallBatch(scryfallIds);

  const cards: DeckCard[] = [];
  let commanderName: string | undefined;
  let commanderImageUri: string | undefined;

  for (const entry of data.cards) {
    const card = cardMap.get(entry.card.uid);
    if (!card) continue;
    const cats = entry.categories.map((c) => c.toLowerCase());
    let section: DeckSection = "mainboard";
    if (cats.some((c) => c.includes("commander"))) section = "commander";
    else if (cats.some((c) => c.includes("companion"))) section = "companion";
    else if (cats.some((c) => c.includes("sideboard"))) section = "sideboard";
    if (section === "commander" && !commanderName) {
      commanderName = card.name;
      commanderImageUri = getCardImageUri(card, "png");
    }
    cards.push({ card, quantity: entry.quantity, section });
  }

  return { name: data.name, format: ARCHIDEKT_FORMATS[data.deckFormat], commanderName, commanderImageUri, cards };
}

// ─── Cross-Deck Search ────────────────────────────────────────────────────────

interface DeckCardResult extends DeckCard {
  deck: SavedDeck;
}

async function searchDeckCards(decks: SavedDeck[], query: string): Promise<DeckCardResult[]> {
  const res = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&unique=cards`);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Scryfall error ${res.status}`);
  const data = (await res.json()) as { data: Card[] };
  const matchingNames = new Set(data.data.map((c) => c.name.toLowerCase()));

  const results: DeckCardResult[] = [];
  for (const deck of decks) {
    for (const deckCard of deck.cards ?? []) {
      if (!deckCard.card?.name) continue;
      if (matchingNames.has(deckCard.card.name.toLowerCase())) {
        results.push({ ...deckCard, deck });
      }
    }
  }
  return results;
}

function groupByDeck(
  results: DeckCardResult[],
  decks: SavedDeck[]
): Array<{ deck: SavedDeck; cards: DeckCardResult[] }> {
  const map = new Map<string, DeckCardResult[]>();
  for (const r of results) {
    if (!map.has(r.deck.id)) map.set(r.deck.id, []);
    map.get(r.deck.id)!.push(r);
  }
  return decks.filter((d) => map.has(d.id)).map((d) => ({ deck: d, cards: map.get(d.id)! }));
}

// ─── Deck List Text Parser ─────────────────────────────────────────────────────

interface TextEntry {
  quantity: number;
  name: string;
  section: DeckSection;
}

function parseDecklist(text: string): TextEntry[] {
  const results: TextEntry[] = [];
  let currentSection: DeckSection = "mainboard";

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("//") || line.startsWith("#")) continue;
    const lower = line.toLowerCase();
    if (/^commanders?$/.test(lower)) {
      currentSection = "commander";
      continue;
    }
    if (/^companions?$/.test(lower)) {
      currentSection = "companion";
      continue;
    }
    if (/^sideboard$/.test(lower)) {
      currentSection = "sideboard";
      continue;
    }
    if (/^(mainboard|main( deck)?)$/.test(lower)) {
      currentSection = "mainboard";
      continue;
    }
    const match = line.match(/^(\d+)x?\s+(.+?)(?:\s+\*CMDR\*)?(?:\s+\(.*\).*)?$/i);
    if (!match) continue;
    const isCommander = /\*CMDR\*/i.test(line);
    results.push({
      quantity: parseInt(match[1], 10),
      name: match[2].trim(),
      section: isCommander ? "commander" : currentSection,
    });
  }
  return results;
}

async function fetchDeckFromText(deckName: string, text: string): Promise<FetchedDeck> {
  const entries = parseDecklist(text);
  if (entries.length === 0) throw new Error("No cards found — check the deck list format");

  const names = [...new Set(entries.map((e) => e.name))];
  const cardMap = new Map<string, Card>();
  for (let i = 0; i < names.length; i += 75) {
    const chunk = names.slice(i, i + 75);
    const res = await fetch("https://api.scryfall.com/cards/collection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifiers: chunk.map((name) => ({ name })) }),
    });
    if (!res.ok) throw new Error(`Scryfall error ${res.status}`);
    const data = (await res.json()) as { data: Card[] };
    for (const card of data.data) cardMap.set(card.name.toLowerCase(), card);
  }

  const cards: DeckCard[] = [];
  let commanderName: string | undefined;
  let commanderImageUri: string | undefined;
  for (const entry of entries) {
    const card = cardMap.get(entry.name.toLowerCase());
    if (!card) continue;
    if (entry.section === "commander" && !commanderName) {
      commanderName = card.name;
      commanderImageUri = getCardImageUri(card, "png");
    }
    cards.push({ card, quantity: entry.quantity, section: entry.section });
  }
  return { name: deckName, commanderName, commanderImageUri, cards };
}

// ─── Card Type Grouping ────────────────────────────────────────────────────────

const TYPE_ORDER = [
  "Creatures",
  "Planeswalkers",
  "Instants",
  "Sorceries",
  "Artifacts",
  "Enchantments",
  "Battles",
  "Lands",
  "Other",
];

function cardType(card: Card): string {
  const t = card.type_line ?? "";
  if (t.includes("Creature")) return "Creatures";
  if (t.includes("Planeswalker")) return "Planeswalkers";
  if (t.includes("Instant")) return "Instants";
  if (t.includes("Sorcery")) return "Sorceries";
  if (t.includes("Artifact")) return "Artifacts";
  if (t.includes("Enchantment")) return "Enchantments";
  if (t.includes("Battle")) return "Battles";
  if (t.includes("Land")) return "Lands";
  return "Other";
}

function buildSections(cards: DeckCard[]): Array<{ label: string; cards: DeckCard[] }> {
  const bySection = (s: DeckSection) => cards.filter((c) => c.section === s);
  const typeGroups = new Map<string, DeckCard[]>();
  for (const entry of bySection("mainboard")) {
    const t = cardType(entry.card);
    if (!typeGroups.has(t)) typeGroups.set(t, []);
    typeGroups.get(t)!.push(entry);
  }
  const sections: Array<{ label: string; cards: DeckCard[] }> = [];
  const commanders = bySection("commander");
  const companions = bySection("companion");
  const sideboard = bySection("sideboard");
  const other = bySection("other");
  if (commanders.length) sections.push({ label: "Commander", cards: commanders });
  if (companions.length) sections.push({ label: "Companion", cards: companions });
  for (const type of TYPE_ORDER) {
    const group = typeGroups.get(type);
    if (group?.length) sections.push({ label: type, cards: group });
  }
  if (sideboard.length) sections.push({ label: "Sideboard", cards: sideboard });
  if (other.length) sections.push({ label: "Other", cards: other });
  return sections;
}

// ─── Add Deck Form ─────────────────────────────────────────────────────────────

type ImportMode = "url" | "text";

function AddDeckForm({ onAdd }: { onAdd: (deck: SavedDeck) => void }) {
  const { pop } = useNavigation();
  const [mode, setMode] = useState<ImportMode>("url");
  const [urlError, setUrlError] = useState<string | undefined>();
  const [nameError, setNameError] = useState<string | undefined>();

  async function handleSubmit(values: { mode: string; url?: string; deckName?: string; deckList?: string }) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Fetching deck…" });
    try {
      let deck: SavedDeck;
      if (values.mode === "url") {
        const trimmed = (values.url ?? "").trim();
        const parsed = parseDeckUrl(trimmed);
        if (!parsed) {
          toast.hide();
          setUrlError("Enter a valid Archidekt or Moxfield URL (archidekt.com/decks/… or moxfield.com/decks/…)");
          return;
        }
        const fetcher = parsed.source === "moxfield" ? fetchMoxfieldDeck : fetchArchidektDeck;
        const fetched = await fetcher(parsed.id);
        deck = {
          id: parsed.id,
          name: fetched.name,
          url: trimmed,
          source: parsed.source,
          format: fetched.format,
          commanderName: fetched.commanderName,
          commanderImageUri: fetched.commanderImageUri,
          cards: fetched.cards,
          addedAt: Date.now(),
          updatedAt: Date.now(),
        };
      } else {
        const deckName = (values.deckName ?? "").trim();
        if (!deckName) {
          toast.hide();
          setNameError("Enter a deck name");
          return;
        }
        const fetched = await fetchDeckFromText(deckName, values.deckList ?? "");
        deck = {
          id: `text-${Date.now()}`,
          name: fetched.name,
          url: "",
          source: "text",
          commanderName: fetched.commanderName,
          commanderImageUri: fetched.commanderImageUri,
          deckListText: values.deckList ?? "",
          cards: fetched.cards,
          addedAt: Date.now(),
          updatedAt: Date.now(),
        };
      }
      onAdd(deck);
      toast.style = Toast.Style.Success;
      toast.title = `Added "${deck.name}"`;
      pop();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to fetch deck";
      toast.message = (err as Error).message;
    }
  }

  return (
    <Form
      navigationTitle="Add Deck"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Deck" onSubmit={handleSubmit} icon={Icon.Plus} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="mode" title="Import From" value={mode} onChange={(v) => setMode(v as ImportMode)}>
        <Form.Dropdown.Item value="url" title="Deck URL (Archidekt or Moxfield)" icon={Icon.Globe} />
        <Form.Dropdown.Item value="text" title="Paste Deck List (Moxfield / any)" icon={Icon.Paragraph} />
      </Form.Dropdown>
      {mode === "url" && (
        <Form.TextField
          id="url"
          title="Deck URL"
          placeholder="https://archidekt.com/decks/… or moxfield.com/decks/…"
          error={urlError}
          onChange={() => setUrlError(undefined)}
        />
      )}
      {mode === "text" && (
        <>
          <Form.TextField
            id="deckName"
            title="Deck Name"
            placeholder="My Atraxa Deck"
            error={nameError}
            onChange={() => setNameError(undefined)}
          />
          <Form.TextArea
            id="deckList"
            title="Deck List"
            placeholder={"1 Atraxa, Praetors' Voice *CMDR*\n1 Sol Ring\n4 Forest\n\nSideboard\n1 Tormod's Crypt"}
            info="MTGO / Moxfield export format. Mark commander with *CMDR* or add a 'Commander' section header."
          />
        </>
      )}
    </Form>
  );
}

// ─── Edit Deck Form ────────────────────────────────────────────────────────────

function EditDeckForm({ deck, onSave }: { deck: SavedDeck; onSave: (deck: SavedDeck) => void }) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();

  async function handleSubmit(values: { deckName: string; deckList: string }) {
    const deckName = values.deckName.trim();
    if (!deckName) {
      setNameError("Enter a deck name");
      return;
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating deck…" });
    try {
      const fetched = await fetchDeckFromText(deckName, values.deckList);
      onSave({
        ...deck,
        name: fetched.name,
        commanderName: fetched.commanderName,
        commanderImageUri: fetched.commanderImageUri,
        deckListText: values.deckList,
        cards: fetched.cards,
        updatedAt: Date.now(),
      });
      toast.style = Toast.Style.Success;
      toast.title = `Updated "${fetched.name}"`;
      pop();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update deck";
      toast.message = (err as Error).message;
    }
  }

  return (
    <Form
      navigationTitle={`Edit — ${deck.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} icon={Icon.Checkmark} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="deckName"
        title="Deck Name"
        defaultValue={deck.name}
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.TextArea
        id="deckList"
        title="Deck List"
        defaultValue={deck.deckListText ?? ""}
        info="MTGO / Moxfield export format. Mark commander with *CMDR* or add a 'Commander' section header."
      />
    </Form>
  );
}

// ─── Deck View ─────────────────────────────────────────────────────────────────

function DeckView({ deck: initialDeck, onUpdate }: { deck: SavedDeck; onUpdate: (deck: SavedDeck) => void }) {
  const { push } = useNavigation();
  const [deck, setDeck] = useState(initialDeck);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

  function toggleFlip(id: string) {
    setFlippedCards((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Only fetch from network if no cached cards (backwards compat for old saved decks)
  const hasCachedCards = (deck.cards?.length ?? 0) > 0;
  const { isLoading, data, error } = usePromise(
    async (id: string, source: DeckSource, deckListText: string | undefined): Promise<FetchedDeck> => {
      if (source === "text") return fetchDeckFromText(deck.name, deckListText ?? "");
      if (source === "moxfield") return fetchMoxfieldDeck(id);
      return fetchArchidektDeck(id);
    },
    [deck.id, deck.source, deck.deckListText],
    {
      execute: !hasCachedCards,
      onError: (err) => {
        void showToast({ style: Toast.Style.Failure, title: "Failed to load deck", message: err.message });
      },
    }
  );

  const displayCards = hasCachedCards ? deck.cards! : (data?.cards ?? []);
  const sections = buildSections(displayCards);

  async function refreshDeck() {
    if (deck.source !== "archidekt") return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Refreshing deck…" });
    try {
      const fetched = await fetchArchidektDeck(deck.id);
      const updated: SavedDeck = { ...deck, ...fetched, cards: fetched.cards, updatedAt: Date.now() };
      setDeck(updated);
      onUpdate(updated);
      toast.style = Toast.Style.Success;
      toast.title = "Deck refreshed";
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Refresh failed";
      toast.message = (err as Error).message;
    }
  }

  function handleEdit(updated: SavedDeck) {
    setDeck(updated);
    onUpdate(updated);
  }

  return (
    <Grid
      columns={3}
      aspectRatio="2/3"
      fit={Grid.Fit.Fill}
      inset={Grid.Inset.Small}
      isLoading={isLoading && !hasCachedCards}
      navigationTitle={deck.name}
    >
      {error && !isLoading && !hasCachedCards && (
        <Grid.EmptyView icon={Icon.ExclamationMark} title="Failed to Load Deck" description={error.message} />
      )}
      {sections.map(({ label, cards }) => (
        <Grid.Section key={label} title={`${label} (${cards.length})`}>
          {cards.map(({ card, quantity }) => {
            const isDFC = isFlippable(card);
            const faceIndex = isDFC && flippedCards.has(card.id) ? 1 : 0;
            const activeFace = isDFC ? card.card_faces![faceIndex] : null;
            const imageUri = activeFace?.image_uris?.png ?? getCardImageUri(card);
            return (
              <Grid.Item
                key={card.id}
                content={
                  imageUri ? { source: imageUri } : { source: Icon.QuestionMark, tintColor: Color.SecondaryText }
                }
                title={`${quantity > 1 ? `${quantity}x ` : ""}${card.name || "Unknown Card"}`}
                subtitle={card.type_line}
                actions={
                  <ActionPanel>
                    {isDFC && (
                      <Action
                        title={`Flip to ${card.card_faces![faceIndex === 0 ? 1 : 0].name}`}
                        icon={Icon.ArrowClockwise}
                        shortcut={{ modifiers: ["cmd"], key: "f" }}
                        onAction={() => toggleFlip(card.id)}
                      />
                    )}
                    <Action
                      title="Show Card Details"
                      icon={Icon.Eye}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                      onAction={() => push(<CardDetailView card={card} />)}
                    />
                    <Action.OpenInBrowser
                      title="Open in Scryfall"
                      url={card.scryfall_uri}
                      icon={{ source: Icon.Globe, tintColor: Color.Blue }}
                      shortcut={{ modifiers: ["cmd"], key: "return" }}
                    />
                    <Action.OpenInBrowser
                      title="Open in Edhrec"
                      url={getEdhrecUrl(card.name)}
                      icon={{ source: Icon.Person, tintColor: Color.Green }}
                      shortcut={{ modifiers: ["cmd", "ctrl"], key: "return" }}
                    />{" "}
                    {/* eslint-disable-line @raycast/prefer-title-case */}
                    <Action.CopyToClipboard
                      title="Copy Card Name"
                      content={card.name}
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
                    <Action.OpenInBrowser
                      title="Open in Scryfall Tagger"
                      url={getTaggerUrl(card)}
                      icon={{ source: Icon.Tag, tintColor: Color.Orange }}
                      shortcut={{ modifiers: ["cmd"], key: "t" }}
                    />
                    <Action
                      title="Show Tags"
                      icon={{ source: Icon.Tag, tintColor: Color.Purple }}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                      onAction={() => push(<CardTagsView card={card} />)}
                    />
                    <Action
                      title="View All Prints"
                      icon={Icon.List}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                      onAction={() => push(<PrintsView card={card} />)}
                    />
                    {deck.source === "archidekt" && (
                      <Action
                        title="Refresh Deck"
                        icon={Icon.ArrowClockwise}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                        onAction={refreshDeck}
                      />
                    )}
                    {deck.source !== "archidekt" && (
                      <Action
                        title="Edit Deck List"
                        icon={Icon.Pencil}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                        onAction={() => push(<EditDeckForm deck={deck} onSave={handleEdit} />)}
                      />
                    )}
                    <Action.OpenInBrowser title="Submit Bug or Feature Request" url={FEEDBACK_URL} icon={Icon.Bug} />
                  </ActionPanel>
                }
              />
            );
          })}
        </Grid.Section>
      ))}
    </Grid>
  );
}

// ─── Main Command ──────────────────────────────────────────────────────────────

export default function BrowseDecks() {
  const { push } = useNavigation();
  const { value: decks, setValue: setDecks } = useLocalStorage<SavedDeck[]>(SAVED_DECKS_KEY, []);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(t);
  }, [searchText]);

  // Backfill card data for decks saved before caching was added
  useEffect(() => {
    const uncached = (decks ?? []).filter((d) => !d.cards?.length && d.source !== "text");
    if (!uncached.length) return;
    (async () => {
      const updated: SavedDeck[] = [];
      for (const deck of uncached) {
        try {
          const fetcher = deck.source === "moxfield" ? fetchMoxfieldDeck : fetchArchidektDeck;
          const fetched = await fetcher(deck.id);
          updated.push({ ...deck, ...fetched, cards: fetched.cards, updatedAt: Date.now() });
        } catch {
          // silently skip decks that fail to backfill
        }
      }
      if (updated.length) {
        setDecks((decks ?? []).map((d) => updated.find((u) => u.id === d.id) ?? d));
      }
    })();
  }, [decks?.length]); // intentional: only re-run when deck count changes

  function toggleFlip(id: string) {
    setFlippedCards((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function upsertDeck(deck: SavedDeck) {
    setDecks([...(decks ?? []).filter((d) => d.id !== deck.id), deck]);
  }

  async function removeDeck(deck: SavedDeck) {
    const confirmed = await confirmAlert({
      title: `Remove "${deck.name}"?`,
      message: "This won't delete the deck from Moxfield or Archidekt.",
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) setDecks((decks ?? []).filter((d) => d.id !== deck.id));
  }

  async function refreshDeck(deck: SavedDeck) {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Refreshing "${deck.name}"…` });
    try {
      const fetched = await fetchArchidektDeck(deck.id);
      upsertDeck({ ...deck, ...fetched, cards: fetched.cards, updatedAt: Date.now() });
      toast.style = Toast.Style.Success;
      toast.title = "Deck refreshed";
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Refresh failed";
      toast.message = (err as Error).message;
    }
  }

  const sorted = [...(decks ?? [])].sort((a, b) => b.addedAt - a.addedAt);
  const isSearchMode = debouncedSearch.trim().length > 0;

  const { isLoading: isSearching, data: searchResults } = usePromise(
    async (query: string) => (query.trim() ? searchDeckCards(sorted, query.trim()) : []),
    [debouncedSearch],
    {
      execute: isSearchMode,
      onError: (err) => {
        void showToast({ style: Toast.Style.Failure, title: "Search failed", message: err.message });
      },
    }
  );

  const grouped = groupByDeck(searchResults ?? [], sorted);

  function cardActions(card: Card, deck: SavedDeck, imageUri: string, isDFC: boolean, faceIndex: number) {
    return (
      <ActionPanel>
        <Action
          title="Open Deck"
          icon={Icon.Eye}
          onAction={() => push(<DeckView deck={deck} onUpdate={upsertDeck} />)}
        />
        {isDFC && (
          <Action
            title={`Flip to ${card.card_faces![faceIndex === 0 ? 1 : 0].name}`}
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            onAction={() => toggleFlip(card.id)}
          />
        )}
        <Action
          title="Show Card Details"
          icon={Icon.MagnifyingGlass}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={() => push(<CardDetailView card={card} />)}
        />
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
        <Action.OpenInBrowser title="Submit Bug or Feature Request" url={FEEDBACK_URL} icon={Icon.Bug} />
      </ActionPanel>
    );
  }

  return (
    <Grid
      columns={3}
      aspectRatio="2/3"
      fit={Grid.Fit.Fill}
      inset={Grid.Inset.Medium}
      navigationTitle="My Decks"
      searchBarPlaceholder="Search cards across your decks…"
      onSearchTextChange={setSearchText}
      filtering={false}
      isLoading={isSearching}
      actions={
        <ActionPanel>
          <Action
            title="Add Deck"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() => push(<AddDeckForm onAdd={upsertDeck} />)}
          />
        </ActionPanel>
      }
    >
      {isSearchMode ? (
        // ── Search results ──
        grouped.length === 0 && !isSearching ? (
          <Grid.EmptyView
            icon={Icon.MagnifyingGlass}
            title="No Matches"
            description="No cards in your decks match this query."
          />
        ) : (
          grouped.map(({ deck, cards }) => (
            <Grid.Section key={deck.id} title={`${deck.name} — ${cards.length} match${cards.length !== 1 ? "es" : ""}`}>
              {cards.map(({ card, quantity }) => {
                const isDFC = isFlippable(card);
                const faceIndex = isDFC && flippedCards.has(card.id) ? 1 : 0;
                const activeFace = isDFC ? card.card_faces![faceIndex] : null;
                const imageUri = activeFace?.image_uris?.png ?? getCardImageUri(card);
                const itemTitle = `${quantity > 1 ? `${quantity}x ` : ""}${card.name || "Unknown Card"}`;
                const fullActions = cardActions(card, deck, imageUri, isDFC, faceIndex);
                return (
                  <Grid.Item
                    key={`${deck.id}-${card.id}`}
                    content={
                      imageUri ? { source: imageUri } : { source: Icon.QuestionMark, tintColor: Color.SecondaryText }
                    }
                    title={itemTitle}
                    subtitle={card.type_line}
                    actions={fullActions}
                  />
                );
              })}
            </Grid.Section>
          ))
        )
      ) : // ── Deck grid ──
      sorted.length === 0 ? (
        <Grid.EmptyView
          icon="🧙"
          title="No Decks Yet"
          description="Press ⌘N to add a Moxfield or Archidekt deck URL."
        />
      ) : (
        <Grid.Section title="My Decks">
          {sorted.map((deck) => (
            <Grid.Item
              key={deck.id}
              content={
                deck.commanderImageUri
                  ? { source: deck.commanderImageUri }
                  : { source: Icon.TwoArrowsClockwise, tintColor: Color.SecondaryText }
              }
              title={deck.name || "Unnamed Deck"}
              subtitle={deck.commanderName}
              actions={
                <ActionPanel>
                  <Action
                    title="Browse Deck"
                    icon={Icon.Eye}
                    onAction={() => push(<DeckView deck={deck} onUpdate={upsertDeck} />)}
                  />
                  <Action
                    title="Add Deck"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={() => push(<AddDeckForm onAdd={upsertDeck} />)}
                  />
                  {deck.source === "archidekt" && (
                    <Action
                      title="Refresh Deck"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                      onAction={() => refreshDeck(deck)}
                    />
                  )}
                  {deck.source !== "archidekt" && (
                    <Action
                      title="Edit Deck List"
                      icon={Icon.Pencil}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                      onAction={() => push(<EditDeckForm deck={deck} onSave={upsertDeck} />)}
                    />
                  )}
                  {deck.url && (
                    <Action.OpenInBrowser
                      title="Open in Browser"
                      url={deck.url}
                      icon={Icon.Globe}
                      shortcut={{ modifiers: ["cmd"], key: "return" }}
                    />
                  )}
                  <Action
                    title="Remove Deck"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => removeDeck(deck)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      )}
    </Grid>
  );
}
