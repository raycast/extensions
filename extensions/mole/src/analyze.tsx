import { List, Icon, Color, ActionPanel, Action, getPreferenceValues, trash, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { execFile } from "child_process";
import { useState, useEffect, useCallback, useMemo } from "react";
import { getMolePathSafe, MOLE_ENV } from "./utils/mole";
import { formatBytes } from "./utils/parsers";
import { MoleNotInstalled } from "./components/MoleNotInstalled";

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

function useAnalyze(molePath: string, dirPath: string) {
  const [data, setData] = useState<AnalyzeResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const scan = useCallback(() => {
    setIsLoading(true);
    setData(null);

    execFile(
      molePath,
      ["analyze", "--json", dirPath],
      { maxBuffer: 10 * 1024 * 1024, env: MOLE_ENV },
      (_err, stdout, stderr) => {
        const output = stdout || stderr || "";
        try {
          setData(JSON.parse(output) as AnalyzeResult);
        } catch {
          setData(null);
        }
        setIsLoading(false);
      },
    );
  }, [molePath, dirPath]);

  useEffect(() => {
    scan();
  }, [scan]);

  return { data, isLoading, revalidate: scan };
}

export default function AnalyzeDisk() {
  const molePath = getMolePathSafe();

  if (!molePath) {
    return <MoleNotInstalled />;
  }

  const { analyzePath } = getPreferenceValues<Preferences.Analyze>();
  const startPath = analyzePath || process.env.HOME || "/";

  return <AnalyzeList molePath={molePath} dirPath={startPath} />;
}

function AnalyzeList({ molePath, dirPath }: { molePath: string; dirPath: string }) {
  const { data, isLoading, revalidate } = useAnalyze(molePath, dirPath);

  const sorted = useMemo<AnalyzeEntry[]>(() => {
    if (!data?.entries) return [];
    return [...data.entries].sort((a, b) => b.size - a.size);
  }, [data]);

  const totalSize = useMemo<number>(() => sorted.reduce((sum: number, e: AnalyzeEntry) => sum + e.size, 0), [sorted]);

  const sizeColor = (size: number): Color => {
    const ratio = totalSize > 0 ? size / totalSize : 0;
    if (ratio > 0.3) return Color.Red;
    if (ratio > 0.1) return Color.Orange;
    if (ratio > 0.05) return Color.Yellow;
    return Color.SecondaryText;
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder={`Browsing ${dirPath}`} navigationTitle={dirPath.split("/").pop()}>
      {isLoading && !data && <List.Item title="Analyzing..." subtitle={dirPath} icon={Icon.MagnifyingGlass} />}
      {sorted.map((entry: AnalyzeEntry) => (
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
    </List>
  );
}
