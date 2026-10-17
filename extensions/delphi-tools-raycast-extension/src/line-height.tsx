import { execFileAsync, getDelphitoolsCliPath } from "./utils/exec";
import type { LaunchProps } from "@raycast/api";
import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  List,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";

import {
  DelphitoolsInstallStatusView,
  getDelphitoolsInstallStatus,
} from "./delphitools-install";

type RatioName = "tight" | "snug" | "normal" | "relaxed" | "loose" | "golden";

type LineHeightResult = {
  name: RatioName;
  px: number;
  ratio: number;
};

type FontSizeFormValues = {
  fontSize: string;
};

const DEFAULT_FONT_SIZE = "16";
const ACTIVE_FONT_SIZE_KEY = "line-height.active-font-size";
const RECENT_FONT_SIZES_KEY = "line-height.recent-font-sizes";
const RATIO_ORDER: RatioName[] = [
  "tight",
  "snug",
  "normal",
  "relaxed",
  "loose",
  "golden",
];

export default function Command(
  props: LaunchProps<{ arguments: Arguments.LineHeight }>,
) {
  return <LineHeightCommand initialFontSize={props.arguments.fontSize} />;
}

function LineHeightCommand({
  initialFontSize = "",
}: {
  initialFontSize?: string;
}) {
  const [isDelphitoolsInstalled, setIsDelphitoolsInstalled] =
    useState<boolean>();

  useEffect(() => {
    async function checkInstallStatus() {
      const status = await getDelphitoolsInstallStatus();

      setIsDelphitoolsInstalled(status.installed);
    }

    checkInstallStatus();
  }, []);

  if (isDelphitoolsInstalled === false) {
    return <DelphitoolsInstallStatusView status={{ installed: false }} />;
  }

  return <LineHeightList initialFontSize={initialFontSize} />;
}

function LineHeightList({ initialFontSize }: { initialFontSize: string }) {
  const [fontSize, setFontSizeState] = useState(
    normalizeFontSize(initialFontSize) || DEFAULT_FONT_SIZE,
  );
  const [recentFontSizes, setRecentFontSizes] = useState<string[]>([]);
  const [results, setResults] = useState<LineHeightResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const lastToastErrorRef = useRef("");
  const initialFontSizeRef = useRef(initialFontSize);

  useEffect(() => {
    async function hydrateFontSize() {
      const storedRecents = await getRecentFontSizes();
      const storedFontSize = normalizeFontSize(
        await LocalStorage.getItem<string>(ACTIVE_FONT_SIZE_KEY),
      );
      const launchFontSize = normalizeFontSize(initialFontSizeRef.current);
      const nextFontSize =
        launchFontSize || storedFontSize || DEFAULT_FONT_SIZE;

      setRecentFontSizes(storedRecents);
      setFontSizeState(nextFontSize);
      await persistFontSize(nextFontSize, storedRecents, setRecentFontSizes);
    }

    hydrateFontSize();
  }, []);

  useEffect(() => {
    if (!fontSize) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    async function loadResults() {
      try {
        const nextResults = await runLineHeight(fontSize);

        setResults(sortResults(nextResults));
        lastToastErrorRef.current = "";
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const toastErrorKey = `${fontSize}:${message}`;

        setResults([]);

        if (lastToastErrorRef.current !== toastErrorKey) {
          lastToastErrorRef.current = toastErrorKey;
          await showToast({
            style: Toast.Style.Failure,
            title: "Could not compute line height",
            message,
          });
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadResults();
  }, [fontSize]);

  async function setFontSize(nextFontSize: string): Promise<boolean> {
    const normalizedFontSize = normalizeFontSize(nextFontSize);

    if (!normalizedFontSize) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter a font size",
      });
      return false;
    }

    setFontSizeState(normalizedFontSize);
    await persistFontSize(
      normalizedFontSize,
      recentFontSizes,
      setRecentFontSizes,
    );
    return true;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search ratios">
      <List.EmptyView
        title="No Line Heights"
        description="Change the font size and try again."
        actions={
          <ActionPanel>
            <Action.Push
              icon={Icon.Pencil}
              title="Change Font Size"
              target={
                <FontSizeForm
                  fontSize={fontSize}
                  onSubmitFontSize={setFontSize}
                />
              }
            />
          </ActionPanel>
        }
      />
      <List.Section title={`Font Size ${fontSize}px`}>
        {results.map((result) => (
          <List.Item
            key={result.name}
            title={getRatioLabel(result.name)}
            subtitle={`${formatNumber(result.ratio)} ratio`}
            accessories={[{ text: `${formatNumber(result.px)}px` }]}
            actions={
              <LineHeightActions
                result={result}
                results={results}
                fontSize={fontSize}
                recentFontSizes={recentFontSizes}
                onFontSizeChange={setFontSize}
              />
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function LineHeightActions({
  result,
  results,
  fontSize,
  recentFontSizes,
  onFontSizeChange,
}: {
  result: LineHeightResult;
  results: LineHeightResult[];
  fontSize: string;
  recentFontSizes: string[];
  onFontSizeChange: (fontSize: string) => Promise<boolean>;
}) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          icon={Icon.Clipboard}
          title="Copy Line Height"
          content={`${formatNumber(result.px)}px`}
        />
        <Action.CopyToClipboard
          icon={Icon.Code}
          title="Copy CSS Declaration"
          content={formatCssDeclaration(result)}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
        <Action
          icon={Icon.List}
          title="Copy All Ratios"
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          onAction={async () => {
            await Clipboard.copy(formatAllRatios(results));
            await showToast({
              style: Toast.Style.Success,
              title: "Copied All Ratios",
            });
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.Push
          icon={Icon.Pencil}
          title="Change Font Size"
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          target={
            <FontSizeForm
              fontSize={fontSize}
              onSubmitFontSize={onFontSizeChange}
            />
          }
        />
      </ActionPanel.Section>
      {recentFontSizes.length ? (
        <ActionPanel.Section title="Recent Font Sizes">
          {recentFontSizes.map((recentFontSize) => (
            <Action
              key={recentFontSize}
              icon={Icon.Clock}
              title={`Use ${recentFontSize} Pixels as Font Size`}
              onAction={() => onFontSizeChange(recentFontSize)}
            />
          ))}
        </ActionPanel.Section>
      ) : null}
    </ActionPanel>
  );
}

function FontSizeForm({
  fontSize,
  onSubmitFontSize,
}: {
  fontSize: string;
  onSubmitFontSize: (fontSize: string) => Promise<boolean>;
}) {
  const { pop } = useNavigation();

  async function handleSubmit(values: FontSizeFormValues) {
    const didUpdateFontSize = await onSubmitFontSize(values.fontSize);

    if (didUpdateFontSize) {
      pop();
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Check}
            title="Use Font Size"
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="fontSize"
        title="Font Size"
        defaultValue={fontSize}
        placeholder="16"
      />
    </Form>
  );
}

async function persistFontSize(
  fontSize: string,
  recentFontSizes: string[],
  setRecentFontSizes: (fontSizes: string[]) => void,
) {
  const nextRecentFontSizes = [
    fontSize,
    ...recentFontSizes.filter((recentFontSize) => recentFontSize !== fontSize),
  ].slice(0, 5);

  setRecentFontSizes(nextRecentFontSizes);
  await LocalStorage.setItem(ACTIVE_FONT_SIZE_KEY, fontSize);
  await LocalStorage.setItem(
    RECENT_FONT_SIZES_KEY,
    JSON.stringify(nextRecentFontSizes),
  );
}

async function getRecentFontSizes(): Promise<string[]> {
  const storedRecentFontSizes = await LocalStorage.getItem<string>(
    RECENT_FONT_SIZES_KEY,
  );

  if (!storedRecentFontSizes) {
    return [];
  }

  try {
    const parsed = JSON.parse(storedRecentFontSizes) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((value) => normalizeFontSize(String(value)))
      .filter((value): value is string => Boolean(value))
      .filter((value, index, values) => values.indexOf(value) === index)
      .slice(0, 5);
  } catch {
    return [];
  }
}

async function runLineHeight(fontSize: string): Promise<LineHeightResult[]> {
  const { stdout } = await execFileAsync(getDelphitoolsCliPath(), [
    "line-height",
    fontSize,
    "--json",
  ]);

  return parseLineHeightOutput(stdout);
}

function parseLineHeightOutput(stdout: string): LineHeightResult[] {
  const parsed = JSON.parse(stdout) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("Unexpected line-height output from delphitools.");
  }

  return parsed.map((item) => {
    if (!item || typeof item !== "object") {
      throw new Error("Unexpected line-height output from delphitools.");
    }

    const record = item as Record<string, unknown>;

    if (
      !isRatioName(record.name) ||
      typeof record.px !== "number" ||
      typeof record.ratio !== "number"
    ) {
      throw new Error("Unexpected line-height output from delphitools.");
    }

    return {
      name: record.name,
      px: record.px,
      ratio: record.ratio,
    };
  });
}

function sortResults(results: LineHeightResult[]): LineHeightResult[] {
  return [...results].sort(
    (left, right) =>
      RATIO_ORDER.indexOf(left.name) - RATIO_ORDER.indexOf(right.name),
  );
}

function isRatioName(value: unknown): value is RatioName {
  return RATIO_ORDER.includes(value as RatioName);
}

function normalizeFontSize(fontSize: string | undefined): string {
  const trimmedFontSize = fontSize?.trim().replace(/px$/i, "") ?? "";

  if (!trimmedFontSize) {
    return "";
  }

  const numericFontSize = Number(trimmedFontSize);

  if (!Number.isFinite(numericFontSize) || numericFontSize <= 0) {
    return "";
  }

  return formatNumber(numericFontSize);
}

function getRatioLabel(name: RatioName): string {
  return name[0].toUpperCase() + name.slice(1);
}

function formatCssDeclaration(result: LineHeightResult): string {
  return `line-height: ${formatNumber(result.px)}px;`;
}

function formatAllRatios(results: LineHeightResult[]): string {
  return results
    .map(
      (result) =>
        `${result.name}: ${formatNumber(result.px)}px (${formatNumber(result.ratio)})`,
    )
    .join("\n");
}

function formatNumber(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : String(Number(value.toFixed(3)));
}
