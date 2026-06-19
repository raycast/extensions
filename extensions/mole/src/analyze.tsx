import { List, Icon, Color, ActionPanel, Action, getPreferenceValues, trash, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { execFile } from "child_process";
import { existsSync } from "fs";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { getMolePathSafe, MOLE_ENV } from "./utils/mole";
import { formatBytes } from "./utils/parsers";
import { MoleNotInstalled } from "./components/MoleNotInstalled";

const ANALYZE_TIMEOUT_MS = 120000;
const MAX_ANALYZE_OUTPUT_BYTES = 8 * 1024 * 1024;
const MAX_VISIBLE_ENTRIES = 500;

interface AnalyzeEntry {
  name: string;
  path: string;
  size: number;
  is_dir: boolean;
}

interface AnalyzeResult {
  path: string;
  entries: AnalyzeEntry[];
}

function normalizeAnalyzeResult(value: unknown): AnalyzeResult {
  const result = value as Partial<AnalyzeResult> | null;
  const entries = Array.isArray(result?.entries)
    ? result.entries.filter((entry): entry is AnalyzeEntry => {
        const candidate = entry as Partial<AnalyzeEntry>;
        return (
          typeof candidate.name === "string" &&
          typeof candidate.path === "string" &&
          typeof candidate.size === "number" &&
          typeof candidate.is_dir === "boolean"
        );
      })
    : [];

  return {
    path: typeof result?.path === "string" ? result.path : "",
    entries,
  };
}

function getAnalyzeLocations(): { title: string; path: string; icon: Icon }[] {
  const home = process.env.HOME;
  const candidates = [
    home ? { title: "Home", path: home, icon: Icon.House } : null,
    home ? { title: "Downloads", path: `${home}/Downloads`, icon: Icon.Download } : null,
    home ? { title: "Desktop", path: `${home}/Desktop`, icon: Icon.Desktop } : null,
    home ? { title: "Documents", path: `${home}/Documents`, icon: Icon.Document } : null,
    { title: "Applications", path: "/Applications", icon: Icon.AppWindow },
    { title: "System Root", path: "/", icon: Icon.HardDrive },
  ];

  return candidates.filter((candidate): candidate is { title: string; path: string; icon: Icon } => {
    return Boolean(candidate && existsSync(candidate.path));
  });
}

function useAnalyze(molePath: string, dirPath: string) {
  const [data, setData] = useState<AnalyzeResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const processRef = useRef<ReturnType<typeof execFile> | null>(null);

  const scan = useCallback(() => {
    processRef.current?.kill();
    setIsLoading(true);
    setData(null);
    setError(null);

    const proc = execFile(
      molePath,
      ["analyze", "--json", dirPath],
      { maxBuffer: MAX_ANALYZE_OUTPUT_BYTES, timeout: ANALYZE_TIMEOUT_MS, env: MOLE_ENV },
      (err, stdout, stderr) => {
        if (processRef.current !== proc) return;
        processRef.current = null;

        if (err) {
          setError(new Error(stderr.trim() || err.message));
          setIsLoading(false);
          return;
        }

        const output = stdout.trim();
        if (!output) {
          setError(new Error("Mole did not return analysis data for this location."));
          setIsLoading(false);
          return;
        }

        try {
          setData(normalizeAnalyzeResult(JSON.parse(output)));
        } catch {
          setError(new Error("Mole returned invalid analysis data for this location."));
        }
        setIsLoading(false);
      },
    );
    processRef.current = proc;
  }, [molePath, dirPath]);

  useEffect(() => {
    scan();
    return () => {
      processRef.current?.kill();
    };
  }, [scan]);

  return { data, error, isLoading, revalidate: scan };
}

export default function AnalyzeDisk() {
  const molePath = getMolePathSafe();

  if (!molePath) {
    return <MoleNotInstalled />;
  }

  const { analyzePath } = getPreferenceValues<Preferences.Analyze>() ?? {};

  if (!analyzePath) {
    return <AnalyzeStart molePath={molePath} />;
  }

  return <AnalyzeList molePath={molePath} dirPath={analyzePath} />;
}

function AnalyzeStart({ molePath }: { molePath: string }) {
  return (
    <List searchBarPlaceholder="Choose a location to analyze...">
      <List.Section title="Locations">
        {getAnalyzeLocations().map((location) => (
          <List.Item
            key={location.path}
            title={location.title}
            subtitle={location.path}
            icon={location.icon}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Analyze Location"
                  icon={Icon.MagnifyingGlass}
                  target={<AnalyzeList molePath={molePath} dirPath={location.path} />}
                />
                <Action.ShowInFinder path={location.path} />
                <Action.CopyToClipboard title="Copy Path" content={location.path} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function AnalyzeList({ molePath, dirPath }: { molePath: string; dirPath: string }) {
  const { data, error, isLoading, revalidate } = useAnalyze(molePath, dirPath);

  const sorted = useMemo<AnalyzeEntry[]>(() => {
    if (!data?.entries) return [];
    return [...data.entries].sort((a, b) => b.size - a.size);
  }, [data]);
  const visibleEntries = useMemo(() => sorted.slice(0, MAX_VISIBLE_ENTRIES), [sorted]);
  const hiddenEntries = sorted.length - visibleEntries.length;

  const totalSize = useMemo<number>(() => sorted.reduce((sum: number, e: AnalyzeEntry) => sum + e.size, 0), [sorted]);

  const sizeColor = (size: number): Color => {
    const ratio = totalSize > 0 ? size / totalSize : 0;
    if (ratio > 0.3) return Color.Red;
    if (ratio > 0.1) return Color.Orange;
    if (ratio > 0.05) return Color.Yellow;
    return Color.SecondaryText;
  };

  if (error) {
    return (
      <List>
        <List.EmptyView
          title="Analysis Failed"
          description={error.message}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action.ShowInFinder path={dirPath} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder={`Browsing ${dirPath}`} navigationTitle={dirPath.split("/").pop()}>
      {isLoading && !data && <List.Item title="Analyzing..." subtitle={dirPath} icon={Icon.MagnifyingGlass} />}
      {visibleEntries.map((entry: AnalyzeEntry) => (
        <List.Item
          key={entry.path}
          title={entry.name}
          icon={entry.is_dir ? Icon.Folder : Icon.Document}
          accessories={[{ tag: { value: formatBytes(entry.size), color: sizeColor(entry.size) } }]}
          actions={
            <ActionPanel>
              {entry.is_dir && (
                <Action.Push
                  title="Browse"
                  icon={Icon.ArrowRight}
                  target={<AnalyzeList molePath={molePath} dirPath={entry.path} />}
                />
              )}
              <Action.ShowInFinder path={entry.path} />
              <Action
                title="Move to Trash"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={async () => {
                  try {
                    await trash(entry.path);
                    await showToast({ style: Toast.Style.Success, title: `${entry.name} trashed` });
                    revalidate();
                  } catch (err) {
                    await showFailureToast(err, { title: "Move to Trash failed" });
                  }
                }}
              />
              <Action.CopyToClipboard title="Copy Path" content={entry.path} />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ))}
      {hiddenEntries > 0 && (
        <List.Item
          title={`${hiddenEntries} smaller items hidden`}
          subtitle={`Showing the largest ${MAX_VISIBLE_ENTRIES} entries to keep Raycast responsive`}
          icon={Icon.EyeDisabled}
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action.ShowInFinder path={dirPath} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
