import { List, Icon, Color, ActionPanel, Action, Toast, showToast, confirmAlert } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { spawn, type ChildProcess } from "child_process";
import { useState, useEffect, useCallback, useRef } from "react";
import { getMolePathSafe, runMole, MOLE_ENV } from "./utils/mole";
import { parseCleanDryRun, type CleanDryRunResult } from "./utils/parsers";
import { MoleNotInstalled } from "./components/MoleNotInstalled";

function useStreamingClean(molePath: string) {
  const [data, setData] = useState<CleanDryRunResult>({ sections: [], totalSpace: "Scanning...", totalItems: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const processRef = useRef<ChildProcess | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startScan = useCallback(() => {
    if (processRef.current) {
      processRef.current.kill();
      processRef.current = null;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setIsLoading(true);
    setData({ sections: [], totalSpace: "Scanning...", totalItems: 0 });
    setError(null);

    const proc = spawn(molePath, ["clean", "--dry-run"], { env: MOLE_ENV });
    processRef.current = proc;
    let buffer = "";

    const handleChunk = (chunk: Buffer) => {
      if (processRef.current !== proc) return;
      buffer += chunk.toString();
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (processRef.current === proc) setData(parseCleanDryRun(buffer));
      }, 300);
    };

    proc.stdout.on("data", handleChunk);
    proc.stderr.on("data", handleChunk);

    proc.on("close", () => {
      if (processRef.current !== proc) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      const final = parseCleanDryRun(buffer);
      setData(final);
      setIsLoading(false);
      processRef.current = null;
      showToast({ style: Toast.Style.Success, title: "Scan complete", message: `${final.totalSpace} recoverable` });
    });

    proc.on("error", (err: Error) => {
      if (processRef.current !== proc) return;
      setError(err);
      setIsLoading(false);
      processRef.current = null;
    });
  }, [molePath]);

  useEffect(() => {
    startScan();
    return () => {
      processRef.current?.kill();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [startScan]);

  return { data, isLoading, error, revalidate: startScan };
}

export default function CleanSystem() {
  const molePath = getMolePathSafe();

  if (!molePath) {
    return <MoleNotInstalled />;
  }

  return <CleanView molePath={molePath} />;
}

interface CleanSummary {
  spaceRecovered: string;
  sectionsCount: number;
  itemsCount: number;
}

function CleanView({ molePath }: { molePath: string }) {
  const { data, error, isLoading, revalidate } = useStreamingClean(molePath);
  const [cleanSummary, setCleanSummary] = useState<CleanSummary | null>(null);

  if (error) {
    return (
      <List>
        <List.EmptyView title="Scan Failed" description={error.message} icon={Icon.ExclamationMark} />
      </List>
    );
  }

  async function handleCleanAll() {
    if (
      await confirmAlert({
        title: "Clean System",
        message: `This will remove approximately ${data.totalSpace} of cached and temporary files. This action cannot be undone.`,
        primaryAction: { title: "Clean All" },
      })
    ) {
      const preCleanSpace = data.totalSpace;
      const preCleanSections = data.sections.length;
      const preCleanItems = data.totalItems;
      const toast = await showToast({ style: Toast.Style.Animated, title: "Cleaning system..." });
      try {
        await runMole(["clean"], { timeout: 600000 });
        toast.style = Toast.Style.Success;
        toast.title = "System cleaned successfully";
        toast.message = `${preCleanSpace} recovered`;
        setCleanSummary({
          spaceRecovered: preCleanSpace,
          sectionsCount: preCleanSections,
          itemsCount: preCleanItems,
        });
      } catch (err) {
        await showFailureToast(err, { title: "Clean failed" });
      }
    }
  }

  if (cleanSummary) {
    return (
      <List>
        <List.Section title="Clean Complete">
          <List.Item
            title="Space Recovered"
            icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
            accessories={[{ tag: { value: cleanSummary.spaceRecovered, color: Color.Green } }]}
          />
          <List.Item
            title="Categories Cleaned"
            icon={{ source: Icon.List, tintColor: Color.Green }}
            accessories={[{ text: `${cleanSummary.sectionsCount} categories` }]}
          />
          <List.Item
            title="Items Processed"
            icon={{ source: Icon.Document, tintColor: Color.Green }}
            accessories={[{ text: `${cleanSummary.itemsCount} items` }]}
          />
        </List.Section>
        <List.Section title="Actions">
          <List.Item
            title="Scan Again"
            icon={Icon.ArrowClockwise}
            actions={
              <ActionPanel>
                <Action
                  title="Scan Again"
                  icon={Icon.ArrowClockwise}
                  onAction={() => {
                    setCleanSummary(null);
                    revalidate();
                  }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search cleanable items...">
      <List.Section title="Summary">
        <List.Item
          title={isLoading ? "Scanning system..." : "Total Recoverable Space"}
          icon={isLoading ? Icon.MagnifyingGlass : { source: Icon.Trash, tintColor: Color.Red }}
          accessories={[
            { tag: { value: data.totalSpace, color: isLoading ? Color.Blue : Color.Red } },
            ...(data.totalItems > 0 ? [{ text: `${data.totalItems} items` }] : []),
          ]}
          actions={
            <ActionPanel>
              {!isLoading && (
                <Action
                  title="Clean All"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={handleCleanAll}
                />
              )}
              <Action title="Refresh Preview" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      </List.Section>
      {data.sections.map((section) => (
        <List.Section key={section.name} title={section.name}>
          {section.items.map((item, i) => (
            <List.Item
              key={`${section.name}-${i}`}
              title={item.description}
              subtitle={item.count > 1 ? `${item.count} locations` : undefined}
              icon={Icon.Document}
              accessories={item.size ? [{ tag: item.size }] : []}
              actions={
                <ActionPanel>
                  {!isLoading && (
                    <Action
                      title="Clean All"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={handleCleanAll}
                    />
                  )}
                  <Action title="Refresh Preview" icon={Icon.ArrowClockwise} onAction={revalidate} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
