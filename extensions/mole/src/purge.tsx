import { List, Icon, Color, ActionPanel, Action, Toast, showToast, confirmAlert, trash } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { execFile } from "child_process";
import { useState, useEffect, useCallback } from "react";
import { getMolePathSafe, getMolePath, runMole, MOLE_ENV } from "./utils/mole";
import { parsePurgeDryRun, type PurgeDryRunResult } from "./utils/parsers";
import { MoleNotInstalled } from "./components/MoleNotInstalled";

function usePurgeScan(molePath: string) {
  const [data, setData] = useState<PurgeDryRunResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const activeRef = useState(() => ({ current: 0 }))[0];

  const scan = useCallback(() => {
    const id = ++activeRef.current;
    setIsLoading(true);
    setData(null);
    setError(null);

    execFile(
      molePath,
      ["purge", "--dry-run", "--debug"],
      { maxBuffer: 10 * 1024 * 1024, timeout: 120000, env: MOLE_ENV },
      (_err, stdout, stderr) => {
        if (activeRef.current !== id) return;
        const output = (stdout || "") + "\n" + (stderr || "");
        setData(parsePurgeDryRun(output));
        setIsLoading(false);
      },
    );
  }, [molePath, activeRef]);

  useEffect(() => {
    scan();
    return () => {
      activeRef.current++;
    };
  }, [scan, activeRef]);

  return { data, isLoading, error, revalidate: scan };
}

export default function PurgeArtifacts() {
  const molePath = getMolePathSafe();

  if (!molePath) {
    return <MoleNotInstalled />;
  }

  return <PurgeView />;
}

function PurgeView() {
  const molePath = getMolePath();
  const { data, error, isLoading, revalidate } = usePurgeScan(molePath);

  if (error) {
    return (
      <List>
        <List.EmptyView title="Scan Failed" description={error.message} icon={Icon.ExclamationMark} />
      </List>
    );
  }

  async function handlePurgeAll() {
    if (
      await confirmAlert({
        title: "Purge All Artifacts",
        message: `This will remove ${data?.totalSpace ?? "unknown"} of build artifacts from ${data?.items.length ?? 0} projects. This action cannot be undone.`,
        primaryAction: { title: "Purge All" },
      })
    ) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Purging artifacts..." });
      try {
        await runMole(["purge"], { timeout: 300000 });
        toast.style = Toast.Style.Success;
        toast.title = "Artifacts purged successfully";
        toast.message = `${data?.totalSpace ?? ""} recovered`;
        revalidate();
      } catch (err) {
        await showFailureToast(err, { title: "Purge failed" });
      }
    }
  }

  const artifactIcon = (type: string): Icon => {
    if (type === "node_modules") return Icon.Box;
    if (type === ".next") return Icon.Globe;
    if (type === "target") return Icon.Hammer;
    if (type === "venv" || type === ".venv") return Icon.CodeBlock;
    if (type === "dist" || type === "build") return Icon.Document;
    return Icon.Folder;
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects...">
      {isLoading && !data && (
        <List.Item title="Scanning projects..." subtitle="This may take about 30 seconds" icon={Icon.MagnifyingGlass} />
      )}
      {data && (
        <>
          <List.Section title="Summary">
            <List.Item
              title="Total Recoverable Space"
              icon={{ source: Icon.Trash, tintColor: Color.Red }}
              accessories={[
                { tag: { value: data.totalSpace, color: Color.Red } },
                { text: `${data.items.length} artifacts` },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Purge All"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={handlePurgeAll}
                  />
                  <Action title="Refresh Preview" icon={Icon.ArrowClockwise} onAction={revalidate} />
                </ActionPanel>
              }
            />
          </List.Section>
          {data.items.map((item, i) => (
            <List.Item
              key={`${item.path}-${i}`}
              title={item.projectName}
              subtitle={item.artifactType}
              icon={artifactIcon(item.artifactType)}
              accessories={[{ tag: item.size }, { text: item.ageLabel }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Remove This Artifact"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      if (
                        await confirmAlert({
                          title: `Remove ${item.artifactType}?`,
                          message: `This will trash ${item.artifactType} from ${item.projectName} (${item.size}).`,
                          primaryAction: { title: "Remove" },
                        })
                      ) {
                        const t = await showToast({
                          style: Toast.Style.Animated,
                          title: `Removing ${item.artifactType}...`,
                        });
                        try {
                          await trash(item.path);
                          t.style = Toast.Style.Success;
                          t.title = `${item.artifactType} removed`;
                          t.message = `${item.size} freed from ${item.projectName}`;
                          revalidate();
                        } catch (err) {
                          await showFailureToast(err, { title: "Remove failed" });
                        }
                      }
                    }}
                  />
                  <Action
                    title="Purge All"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={handlePurgeAll}
                  />
                  <Action.ShowInFinder path={item.path} />
                  <Action.CopyToClipboard title="Copy Path" content={item.path} />
                  <Action title="Refresh Preview" icon={Icon.ArrowClockwise} onAction={revalidate} />
                </ActionPanel>
              }
            />
          ))}
        </>
      )}
    </List>
  );
}
