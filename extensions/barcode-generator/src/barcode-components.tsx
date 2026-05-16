import bwipjs from "@bwip-js/node";
import {
  Action,
  ActionPanel,
  Detail,
  Form,
  getPreferenceValues,
  List,
  LocalStorage,
  Toast,
  showInFinder,
  showToast,
  useNavigation,
} from "@raycast/api";
import { access, copyFile, mkdir, writeFile } from "fs/promises";
import { homedir, tmpdir } from "os";
import { join } from "path";
import { useEffect, useState } from "react";

export type BarcodeKind = "1D" | "2D";

export type BarcodeType = {
  id: string;
  title: string;
  description: string;
  example: string;
  placeholder: string;
};

type BarcodeFormValues = {
  text: string;
};

export type BarcodeHistoryEntry = {
  id: string;
  createdAt: string;
  kind: BarcodeKind;
  barcodeType: BarcodeType;
  text: string;
};

type BarcodeTypeListCommandProps = {
  kind: BarcodeKind;
  searchBarPlaceholder: string;
  barcodeTypes: BarcodeType[];
};

type Preferences = {
  scale1d?: string;
  height1d?: string;
  includeText1d?: boolean;
  scale2d?: string;
  paddingWidth?: string;
  paddingHeight?: string;
  barColor?: string;
  backgroundColor?: string;
  hideSymbology?: boolean;
};

const HISTORY_STORAGE_KEY = "barcode-history";
const LAST_USED_STORAGE_KEY = "last-used-barcode-type";
const FAVORITES_STORAGE_KEY = "favorite-barcode-types";
const HISTORY_LIMIT = 50;

type LastUsedBarcodeEntry = {
  kind: BarcodeKind;
  barcodeType: BarcodeType;
};

type FavoriteBarcodeEntry = {
  kind: BarcodeKind;
  barcodeType: BarcodeType;
};

const EXCLUDED_BARCODE_IDS = new Set(["raw", "symbol"]);

const TWO_D_BARCODE_IDS = new Set([
  "pdf417",
  "pdf417compact",
  "micropdf417",
  "datamatrix",
  "datamatrixrectangular",
  "datamatrixrectangularextension",
  "mailmark",
  "qrcode",
  "swissqrcode",
  "microqrcode",
  "rectangularmicroqrcode",
  "maxicode",
  "azteccode",
  "azteccodecompact",
  "aztecrune",
  "codeone",
  "hanxin",
  "dotcode",
  "ultracode",
  "gs1-cc",
  "ean13composite",
  "ean8composite",
  "upcacomposite",
  "upcecomposite",
  "databaromnicomposite",
  "databarstackedcomposite",
  "databarstackedomnicomposite",
  "databartruncatedcomposite",
  "databarlimitedcomposite",
  "databarexpandedcomposite",
  "databarexpandedstackedcomposite",
  "gs1-128composite",
  "gs1datamatrix",
  "gs1datamatrixrectangular",
  "gs1dldatamatrix",
  "gs1qrcode",
  "gs1dlqrcode",
  "gs1dotcode",
  "hibcdatamatrix",
  "hibcdatamatrixrectangular",
  "hibcpdf417",
  "hibcmicropdf417",
  "hibcqrcode",
  "hibccodablockf",
  "hibcazteccode",
  "codablockf",
]);

const BARCODE_TYPE_OVERRIDES: Partial<Record<string, Partial<BarcodeType>>> = {
  azteccode: {
    description: "Dense 2D format commonly used in tickets, transport, and mobile boarding passes.",
    placeholder: "Enter text or ticket data",
  },
  code128: {
    description: "Flexible high-density linear barcode for general-purpose data.",
    placeholder: "Enter text, numbers, or symbols",
  },
  code39: {
    description: "Classic alphanumeric barcode often used for labels and inventory.",
    placeholder: "Enter uppercase letters, numbers, spaces, or -.$/+%",
  },
  code93: {
    description: "Compact alphanumeric format similar to Code 39.",
    placeholder: "Enter alphanumeric data",
  },
  datamatrix: {
    description: "Compact square 2D code often used on labels, hardware, and manufacturing parts.",
    placeholder: "Enter text or identifiers",
  },
  interleaved2of5: {
    placeholder: "Enter an even number of digits",
  },
  itf14: {
    description: "Packaging barcode for GTIN-14 values.",
    placeholder: "Enter 13 or 14 digits",
  },
  microqrcode: {
    description: "Smaller QR variant for short payloads where space is tight.",
    placeholder: "Enter a short value",
  },
  qrcode: {
    description: "Widely supported 2D barcode for text, URLs, and general-purpose data.",
    placeholder: "Enter a URL, text, or other data",
  },
  rationalizedCodabar: {
    title: "Codabar",
    description: "Older linear format used in logistics and libraries.",
    placeholder: "Enter Codabar-compatible characters",
  },
  swissqrcode: {
    description: "Swiss QR Code used for Swiss payment slips and invoicing.",
    placeholder: "Enter Swiss QR bill payload data",
  },
};

export const ONE_D_BARCODE_TYPES: BarcodeType[] = buildBarcodeTypes("1D");

export const TWO_D_BARCODE_TYPES: BarcodeType[] = buildBarcodeTypes("2D");

export function BarcodeTypeListCommand({ kind, searchBarPlaceholder, barcodeTypes }: BarcodeTypeListCommandProps) {
  const preferences = getPreferenceValues<Preferences>();
  const [favoriteKeys, setFavoriteKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadFavorites();
  }, []);

  async function loadFavorites() {
    const favorites = await getFavoriteBarcodeEntries();
    setFavoriteKeys(new Set(favorites.map((entry) => getFavoriteKey(entry.kind, entry.barcodeType.id))));
  }

  const sortedBarcodeTypes = [...barcodeTypes].sort((left, right) => {
    const leftFavorite = favoriteKeys.has(getFavoriteKey(kind, left.id));
    const rightFavorite = favoriteKeys.has(getFavoriteKey(kind, right.id));

    if (leftFavorite === rightFavorite) {
      return 0;
    }

    return leftFavorite ? -1 : 1;
  });

  return (
    <List isShowingDetail searchBarPlaceholder={searchBarPlaceholder}>
      {sortedBarcodeTypes.map((barcodeType) => {
        const isFavorite = favoriteKeys.has(getFavoriteKey(kind, barcodeType.id));

        return (
          <List.Item
            key={barcodeType.id}
            title={barcodeType.title}
            subtitle={preferences.hideSymbology ? undefined : barcodeType.id}
            accessories={[...(isFavorite ? [{ icon: "⭐" }] : []), { text: barcodeType.example }]}
            detail={
              <List.Item.Detail
                markdown={[
                  `# ${barcodeType.title}`,
                  "",
                  barcodeType.description,
                  "",
                  `**Example input:** \`${barcodeType.example}\``,
                ].join("\n")}
              />
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title="Choose Barcode Type"
                  target={<BarcodeInputForm kind={kind} barcodeType={barcodeType} />}
                />
                <Action
                  title={isFavorite ? "Unfavorite Barcode Type" : "Favorite Barcode Type"}
                  onAction={async () => {
                    const nextFavorites = await toggleFavoriteBarcodeEntry({ kind, barcodeType });
                    setFavoriteKeys(
                      new Set(nextFavorites.map((entry) => getFavoriteKey(entry.kind, entry.barcodeType.id))),
                    );
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export function FavoriteBarcodeTypesCommand() {
  const preferences = getPreferenceValues<Preferences>();
  const [favorites, setFavorites] = useState<FavoriteBarcodeEntry[]>();

  useEffect(() => {
    loadFavorites();
  }, []);

  async function loadFavorites() {
    const entries = await getFavoriteBarcodeEntries();
    setFavorites(entries);
  }

  if (favorites === undefined) {
    return <List isLoading />;
  }

  if (favorites.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No Favorite Barcode Types Yet"
          description="Favorite a barcode type from one of the barcode selector screens to see it here."
        />
      </List>
    );
  }

  return (
    <List isShowingDetail searchBarPlaceholder="Choose a favorite barcode type">
      {favorites.map(({ kind, barcodeType }) => (
        <List.Item
          key={getFavoriteKey(kind, barcodeType.id)}
          title={barcodeType.title}
          subtitle={preferences.hideSymbology ? undefined : barcodeType.id}
          accessories={[{ text: kind }, { icon: "⭐" }, { text: barcodeType.example }]}
          detail={
            <List.Item.Detail
              markdown={[
                `# ${barcodeType.title}`,
                "",
                barcodeType.description,
                "",
                `**Family:** ${kind}`,
                "",
                `**Example input:** \`${barcodeType.example}\``,
              ].join("\n")}
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Choose Barcode Type"
                target={<BarcodeInputForm kind={kind} barcodeType={barcodeType} />}
              />
              <Action
                title="Unfavorite Barcode Type"
                onAction={async () => {
                  const nextFavorites = await toggleFavoriteBarcodeEntry({ kind, barcodeType });
                  setFavorites(nextFavorites);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export function LastUsedBarcodeCommand() {
  const [lastUsed, setLastUsed] = useState<LastUsedBarcodeEntry | null>();

  useEffect(() => {
    loadLastUsed();
  }, []);

  async function loadLastUsed() {
    const entry = await getLastUsedBarcodeEntry();
    setLastUsed(entry);
  }

  if (lastUsed === undefined) {
    return <List isLoading />;
  }

  if (lastUsed === null) {
    return (
      <List>
        <List.EmptyView
          title="No Barcode Type Used Yet"
          description="Generate a 1D or 2D barcode first, then this command will jump straight to that type."
        />
      </List>
    );
  }

  return <BarcodeInputForm kind={lastUsed.kind} barcodeType={lastUsed.barcodeType} />;
}

export function BarcodeInputForm({ kind, barcodeType }: { kind: BarcodeKind; barcodeType: BarcodeType }) {
  const preferences = getPreferenceValues<Preferences>();
  const { push } = useNavigation();
  const [textError, setTextError] = useState<string | undefined>();

  const handleSubmit = (values: BarcodeFormValues) => {
    const trimmedText = values.text.trim();
    if (!trimmedText) {
      setTextError("A barcode value is required.");
      return false;
    }

    push(<BarcodePreview kind={kind} barcodeType={barcodeType} text={trimmedText} saveToHistory />);
    return true;
  };

  return (
    <Form
      navigationTitle={barcodeType.title}
      actions={
        <ActionPanel>
          <Action.SubmitForm<BarcodeFormValues> title="Generate Barcode" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Selected Type"
        text={preferences.hideSymbology ? barcodeType.title : `${barcodeType.title} (${barcodeType.id})`}
      />
      <Form.Description title="About" text={barcodeType.description} />
      <Form.TextField
        id="text"
        title="Value"
        placeholder={barcodeType.placeholder}
        info={`Try something like ${barcodeType.example}`}
        error={textError}
        onChange={(value) => {
          if (textError && value.trim()) {
            setTextError(undefined);
          }
        }}
      />
    </Form>
  );
}

export function BarcodePreview({
  kind,
  barcodeType,
  text,
  saveToHistory = false,
}: {
  kind: BarcodeKind;
  barcodeType: BarcodeType;
  text: string;
  saveToHistory?: boolean;
}) {
  const preferences = getPreferenceValues<Preferences>();
  const [markdown, setMarkdown] = useState<string>(
    [`# ${barcodeType.title}`, "", `Encoding \`${text}\``, "", "_Generating barcode preview..._"].join("\n"),
  );
  const [error, setError] = useState<string>();
  const [barcodeFilePath, setBarcodeFilePath] = useState<string>();
  const [savedFilePath, setSavedFilePath] = useState<string>();

  useEffect(() => {
    let cancelled = false;

    async function generateBarcode() {
      try {
        const png = await bwipjs.toBuffer(getRenderOptions(kind, barcodeType.id, text));

        if (cancelled) {
          return;
        }

        const dataUrl = `data:image/png;base64,${png.toString("base64")}`;
        const filePath = await writeBarcodeImage(barcodeType.id, text, png);

        if (cancelled) {
          return;
        }

        if (saveToHistory) {
          await setLastUsedBarcodeEntry({
            kind,
            barcodeType,
          });
          await addHistoryEntry({
            id: `${Date.now()}-${barcodeType.id}-${text}`,
            createdAt: new Date().toISOString(),
            kind,
            barcodeType,
            text,
          });
        }

        if (cancelled) {
          return;
        }

        setError(undefined);
        setBarcodeFilePath(filePath);
        setMarkdown(
          [`# ${barcodeType.title}`, "", `Encoding \`${text}\``, "", `![${barcodeType.title}](${dataUrl})`].join("\n"),
        );
      } catch (generationError) {
        if (cancelled) {
          return;
        }

        const rawMessage = generationError instanceof Error ? generationError.message : String(generationError);
        const friendlyMessage = getFriendlyBarcodeErrorMessage(barcodeType, rawMessage);
        setError(friendlyMessage);
        setBarcodeFilePath(undefined);
        setMarkdown(renderErrorMarkdown(barcodeType, text, friendlyMessage));
      }
    }

    generateBarcode();

    return () => {
      cancelled = true;
    };
  }, [barcodeType, kind, saveToHistory, text]);

  return (
    <Detail
      navigationTitle={barcodeType.title}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Type" text={barcodeType.title} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Family" text={kind} />
          {!preferences.hideSymbology ? (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="Symbology" text={barcodeType.id} />
            </>
          ) : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Value" text={text} />
          {error ? (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="Status" text="Invalid input" />
            </>
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {barcodeFilePath ? (
            <Action.CopyToClipboard title="Copy Barcode Image" content={{ file: barcodeFilePath }} />
          ) : null}
          {barcodeFilePath ? (
            <Action
              title="Save Barcode Image"
              onAction={() => saveBarcodeImage(barcodeType.id, text, barcodeFilePath, setSavedFilePath)}
            />
          ) : null}
          {savedFilePath ? <Action.ShowInFinder title="Show Saved Image" path={savedFilePath} /> : null}
          <Action.Push title="Generate Another" target={<BarcodeInputForm kind={kind} barcodeType={barcodeType} />} />
        </ActionPanel>
      }
    />
  );
}

export function BarcodeHistoryDetail({
  kind,
  barcodeType,
  text,
  createdAt,
}: {
  kind: BarcodeKind;
  barcodeType: BarcodeType;
  text: string;
  createdAt: string;
}) {
  const preferences = getPreferenceValues<Preferences>();
  const [markdown, setMarkdown] = useState<string>(
    [`# ${barcodeType.title}`, "", `Encoding \`${text}\``, "", "_Generating barcode preview..._"].join("\n"),
  );

  useEffect(() => {
    let cancelled = false;

    async function generateBarcodePreview() {
      try {
        const png = await bwipjs.toBuffer(getRenderOptions(kind, barcodeType.id, text));

        if (cancelled) {
          return;
        }

        const dataUrl = `data:image/png;base64,${png.toString("base64")}`;
        setMarkdown(
          [
            `# ${barcodeType.title}`,
            "",
            `![${barcodeType.title}](${dataUrl})`,
            "",
            `**Family:** ${kind}`,
            "",
            `**Value:** \`${text}\``,
            "",
            `**Generated:** ${formatHistoryTimestamp(createdAt)}`,
          ].join("\n"),
        );
      } catch {
        if (cancelled) {
          return;
        }

        setMarkdown(
          [
            `# ${barcodeType.title}`,
            "",
            `**Family:** ${kind}`,
            "",
            `**Value:** \`${text}\``,
            "",
            `**Generated:** ${formatHistoryTimestamp(createdAt)}`,
            "",
            "_Preview unavailable for this history item._",
          ].join("\n"),
        );
      }
    }

    generateBarcodePreview();

    return () => {
      cancelled = true;
    };
  }, [barcodeType, createdAt, kind, text]);

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Type" text={barcodeType.title} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Family" text={kind} />
          {!preferences.hideSymbology ? (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Symbology" text={barcodeType.id} />
            </>
          ) : null}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Generated" text={formatHistoryTimestamp(createdAt)} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export async function getHistoryEntries() {
  const stored = await LocalStorage.getItem<string>(HISTORY_STORAGE_KEY);
  if (!stored) {
    return [] as BarcodeHistoryEntry[];
  }

  try {
    const parsed = JSON.parse(stored) as BarcodeHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function clearHistoryEntries() {
  await LocalStorage.removeItem(HISTORY_STORAGE_KEY);
}

export function formatHistoryTimestamp(isoString: string) {
  return new Date(isoString).toLocaleString();
}

export async function getLastUsedBarcodeEntry() {
  const stored = await LocalStorage.getItem<string>(LAST_USED_STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored) as LastUsedBarcodeEntry;
    if (!parsed?.kind || !parsed?.barcodeType?.id) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function getFavoriteBarcodeEntries() {
  const stored = await LocalStorage.getItem<string>(FAVORITES_STORAGE_KEY);
  if (!stored) {
    return [] as FavoriteBarcodeEntry[];
  }

  try {
    const parsed = JSON.parse(stored) as FavoriteBarcodeEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function addHistoryEntry(entry: BarcodeHistoryEntry) {
  const entries = await getHistoryEntries();
  const nextEntries = [
    entry,
    ...entries.filter(
      (item) => !(item.kind === entry.kind && item.barcodeType.id === entry.barcodeType.id && item.text === entry.text),
    ),
  ].slice(0, HISTORY_LIMIT);

  await LocalStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextEntries));
}

async function setLastUsedBarcodeEntry(entry: LastUsedBarcodeEntry) {
  await LocalStorage.setItem(LAST_USED_STORAGE_KEY, JSON.stringify(entry));
}

async function toggleFavoriteBarcodeEntry(entry: FavoriteBarcodeEntry) {
  const entries = await getFavoriteBarcodeEntries();
  const entryKey = getFavoriteKey(entry.kind, entry.barcodeType.id);
  const exists = entries.some((item) => getFavoriteKey(item.kind, item.barcodeType.id) === entryKey);
  const nextEntries = exists
    ? entries.filter((item) => getFavoriteKey(item.kind, item.barcodeType.id) !== entryKey)
    : [entry, ...entries];

  await LocalStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(nextEntries));
  return nextEntries;
}

function getRenderOptions(kind: BarcodeKind, barcodeTypeId: string, text: string) {
  const preferences = getPreferenceValues<Preferences>();
  const paddingWidth = parsePositiveNumber(preferences.paddingWidth, 2);
  const paddingHeight = parsePositiveNumber(preferences.paddingHeight, 2);
  const backgroundColor = normalizeHexColor(preferences.backgroundColor, "FFFFFF");
  const barColor = normalizeHexColor(preferences.barColor, "000000");

  if (kind === "1D") {
    return {
      bcid: barcodeTypeId,
      text,
      scale: parsePositiveNumber(preferences.scale1d, 3),
      height: parsePositiveNumber(preferences.height1d, 12),
      includetext: preferences.includeText1d ?? true,
      textxalign: "center" as const,
      paddingwidth: paddingWidth,
      paddingheight: paddingHeight,
      backgroundcolor: backgroundColor,
      barcolor: barColor,
    };
  }

  return {
    bcid: barcodeTypeId,
    text,
    scale: parsePositiveNumber(preferences.scale2d, 4),
    paddingwidth: paddingWidth,
    paddingheight: paddingHeight,
    backgroundcolor: backgroundColor,
    barcolor: barColor,
  };
}

function renderErrorMarkdown(barcodeType: BarcodeType, text: string, message: string) {
  return [`# ${barcodeType.title}`, "", `Unable to encode \`${text}\`.`, "", message].join("\n");
}

function getFriendlyBarcodeErrorMessage(barcodeType: BarcodeType, rawMessage: string) {
  const cleanedMessage = normalizeBarcodeErrorMessage(rawMessage);

  if (/must contain only/i.test(cleanedMessage)) {
    return cleanedMessage;
  }

  if (/even number of digits/i.test(cleanedMessage)) {
    return cleanedMessage;
  }

  if (/must be 1?1?2 or 13 digits/i.test(cleanedMessage) || /must be 7 or 8 digits/i.test(cleanedMessage)) {
    return cleanedMessage;
  }

  if (/cannot be blank|empty/i.test(cleanedMessage)) {
    return "Enter a value for this barcode type.";
  }

  return `The value is not valid for ${barcodeType.title}. Check the selected barcode type and try a different value.`;
}

function normalizeBarcodeErrorMessage(rawMessage: string) {
  const withoutPrefix = rawMessage.replace(/^[^.]+\.\w+#\d+:\s*/i, "").trim();
  return withoutPrefix.replace(/\s+/g, " ");
}

async function writeBarcodeImage(barcodeTypeId: string, text: string, png: Buffer) {
  const fileName = `${sanitizeFilePart(barcodeTypeId)}-${sanitizeFilePart(text)}.png`;
  const filePath = join(tmpdir(), fileName);
  await writeFile(filePath, png);
  return filePath;
}

async function saveBarcodeImage(
  barcodeTypeId: string,
  text: string,
  sourceFilePath: string,
  setSavedFilePath: (path: string) => void,
) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Saving barcode image",
  });

  try {
    const downloadsDirectory = join(homedir(), "Downloads");
    await mkdir(downloadsDirectory, { recursive: true });

    const destinationFilePath = await getUniqueBarcodeSavePath(downloadsDirectory, barcodeTypeId, text);
    await copyFile(sourceFilePath, destinationFilePath);

    setSavedFilePath(destinationFilePath);

    toast.style = Toast.Style.Success;
    toast.title = "Barcode image saved";
    toast.message = destinationFilePath;
    toast.primaryAction = {
      title: "Show in Finder",
      onAction: () => {
        showInFinder(destinationFilePath);
      },
    };
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not save barcode image";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

async function getUniqueBarcodeSavePath(downloadsDirectory: string, barcodeTypeId: string, text: string) {
  const baseName = `${sanitizeFilePart(barcodeTypeId)}-${sanitizeFilePart(text)}`;

  for (let index = 0; index < 1000; index += 1) {
    const suffix = index === 0 ? "" : `-${index + 1}`;
    const candidatePath = join(downloadsDirectory, `${baseName}${suffix}.png`);

    try {
      await access(candidatePath);
    } catch {
      return candidatePath;
    }
  }

  return join(downloadsDirectory, `${baseName}-${Date.now()}.png`);
}

function sanitizeFilePart(value: string) {
  return (
    value
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "barcode"
  );
}

function parsePositiveNumber(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeHexColor(value: string | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().replace(/^#/, "").toUpperCase();
  return /^[0-9A-F]{6}$/.test(normalized) ? normalized : fallback;
}

function getFavoriteKey(kind: BarcodeKind, barcodeTypeId: string) {
  return `${kind}:${barcodeTypeId}`;
}

function buildBarcodeTypes(kind: BarcodeKind) {
  return bwipjs.symbolList
    .filter((symbol) => !EXCLUDED_BARCODE_IDS.has(symbol.bcid))
    .filter((symbol) => (kind === "2D" ? TWO_D_BARCODE_IDS.has(symbol.bcid) : !TWO_D_BARCODE_IDS.has(symbol.bcid)))
    .map((symbol) => {
      const overrides = BARCODE_TYPE_OVERRIDES[symbol.bcid] ?? {};

      return {
        id: symbol.bcid,
        title: overrides.title ?? symbol.desc,
        description:
          overrides.description ??
          `${symbol.desc} supported by bwip-js.${TWO_D_BARCODE_IDS.has(symbol.bcid) ? " This is a 2D barcode type." : " This is a 1D barcode type."}`,
        example: overrides.example ?? symbol.text,
        placeholder: overrides.placeholder ?? getDefaultPlaceholder(kind, symbol.bcid),
      } satisfies BarcodeType;
    });
}

function getDefaultPlaceholder(kind: BarcodeKind, barcodeTypeId: string) {
  if (kind === "2D") {
    return "Enter the value to encode";
  }

  if (
    /ean|upc|isbn|ismn|issn|itf|code2of5|msi|postnet|planet|pharmacode|plessey|identcode|leitcode/i.test(barcodeTypeId)
  ) {
    return "Enter digits or the required barcode payload";
  }

  return "Enter the value to encode";
}
