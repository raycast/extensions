import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  List,
  Toast,
  showInFinder,
  showToast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { runMintSurface, shortPath } from "./mint-cli";
import { MissingMint } from "./missing-mint";
import { useMintCLI } from "./use-mint-cli";

type RedactForm = { source: string[]; outputPath: string };

type Detection = {
  id: string;
  category: string;
  categoryTitle: string;
  ordinal: number;
  pageIndex: number;
  source: "auto" | "manual";
  defaultSelected: boolean;
};

type RedactScanResponse = {
  sessionID: string;
  sourcePath: string;
  outputPath: string;
  pageCount: number;
  detectionCount: number;
  items: Detection[];
};

type RedactExportResponse = {
  outputPath: string;
  redactionCount: number;
  outputBytes: number;
};

export default function Command() {
  const { resolution, recheck } = useMintCLI();
  const { push } = useNavigation();
  if (resolution.status !== "ready") return <MissingMint resolution={resolution} onRetry={recheck} />;

  return (
    <Form
      navigationTitle="Quick Redact"
      actions={
        <ActionPanel>
          <Action.SubmitForm<RedactForm>
            title="Detect Sensitive Areas"
            icon={Icon.EyeDisabled}
            onSubmit={(values) => {
              const sourcePath = values.source[0];
              if (!sourcePath) {
                showToast({ style: Toast.Style.Failure, title: "Choose a PDF or image" });
                return;
              }
              push(
                <RedactReview
                  cli={resolution.path}
                  sourcePath={sourcePath}
                  outputPath={values.outputPath.trim() || undefined}
                />,
              );
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="source" title="PDF or Image" allowMultipleSelection={false} canChooseDirectories={false} />
      <Form.TextField
        id="outputPath"
        title="Output Path"
        placeholder="Optional · Mint proposes a redacted copy beside the original"
      />
      <Form.Description text="Mint detects faces, barcodes, account details, IDs, names, contact details, addresses, and dates locally. Detection text never leaves Mint or appears in Raycast's response." />
    </Form>
  );
}

function RedactReview({ cli, sourcePath, outputPath }: { cli: string; sourcePath: string; outputPath?: string }) {
  const { pop } = useNavigation();
  const [selectedIDs, setSelectedIDs] = useState<Set<string>>(new Set());
  const initializedSession = useRef<string>();
  const { data, error, isLoading } = usePromise(async () =>
    runMintSurface<RedactScanResponse>(cli, { action: "redact.scan", path: sourcePath, confirmed: true }, 30 * 60_000),
  );

  useEffect(() => {
    if (!data || initializedSession.current === data.sessionID) return;
    initializedSession.current = data.sessionID;
    setSelectedIDs(new Set(data.items.filter((item) => item.defaultSelected).map((item) => item.id)));
  }, [data]);

  const toggle = (id: string) =>
    setSelectedIDs((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function exportSelected() {
    if (!data || selectedIDs.size === 0) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Mint is saving the redacted copy…" });
    try {
      const result = await runMintSurface<RedactExportResponse>(
        cli,
        {
          action: "redact.export",
          sessionID: data.sessionID,
          itemIDs: [...selectedIDs],
          outputPath,
          confirmed: true,
        },
        30 * 60_000,
      );
      toast.style = Toast.Style.Success;
      toast.title = `Redacted ${result.redactionCount} area${result.redactionCount === 1 ? "" : "s"}`;
      toast.message = shortPath(result.outputPath);
      await showInFinder(result.outputPath);
      pop();
    } catch (exportError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Mint could not save the redacted copy";
      toast.message = exportError instanceof Error ? exportError.message : String(exportError);
    }
  }

  const grouped = new Map<string, Detection[]>();
  for (const item of data?.items ?? []) {
    const key = data && data.pageCount > 1 ? `Page ${item.pageIndex + 1} · ${item.categoryTitle}` : item.categoryTitle;
    const group = grouped.get(key) ?? [];
    group.push(item);
    grouped.set(key, group);
  }

  return (
    <List isLoading={isLoading} navigationTitle="Review Redactions" searchBarPlaceholder="Filter detected categories">
      {error ? (
        <List.EmptyView title="Redact scan failed" description={error.message} icon={Icon.ExclamationMark} />
      ) : null}
      {!error && !isLoading && data?.items.length === 0 ? (
        <List.EmptyView
          title="No sensitive areas detected"
          description="Use Full Redact to draw custom blocks in Mint."
          icon={Icon.CheckCircle}
        />
      ) : null}
      {[...grouped.entries()].map(([title, items]) => (
        <List.Section key={title} title={title} subtitle={`${items.length} detected`}>
          {items.map((item) => (
            <List.Item
              key={item.id}
              icon={{
                source: selectedIDs.has(item.id) ? Icon.CheckCircle : Icon.Circle,
                tintColor: selectedIDs.has(item.id) ? Color.Green : Color.SecondaryText,
              }}
              title={`${item.categoryTitle} ${item.ordinal}`}
              subtitle={data && data.pageCount > 1 ? `Page ${item.pageIndex + 1}` : "Auto-detected locally"}
              accessories={[
                {
                  tag: {
                    value: selectedIDs.has(item.id) ? "Cover" : "Leave visible",
                    color: selectedIDs.has(item.id) ? Color.Red : Color.SecondaryText,
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={selectedIDs.has(item.id) ? "Leave This Area Visible" : "Cover This Area"}
                    icon={selectedIDs.has(item.id) ? Icon.Eye : Icon.EyeDisabled}
                    onAction={() => toggle(item.id)}
                  />
                  <Action
                    title="Save Redacted Copy"
                    icon={Icon.SaveDocument}
                    onAction={exportSelected}
                    disabled={selectedIDs.size === 0}
                  />
                  <ActionPanel.Section>
                    <Action
                      title="Cover All Detected Areas"
                      icon={Icon.Checkmark}
                      onAction={() => setSelectedIDs(new Set(data?.items.map((candidate) => candidate.id) ?? []))}
                    />
                    <Action title="Deselect All" icon={Icon.Circle} onAction={() => setSelectedIDs(new Set())} />
                    <Action.ShowInFinder path={sourcePath} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
