/**
 * Import/Export View — main UI for portfolio CSV import and export.
 *
 * Uses single-frame rendering with React state to switch between phases:
 *   1. **Menu** — Choose Export or Import
 *   2. **Export** — Generates CSV and saves to Downloads / clipboard
 *   3. **Import File Path** — User enters a file path manually
 *   4. **Import Preview** — Shows parsed rows, errors, skipped rows, duplicates
 *   5. **Import Done** — Success confirmation
 *
 * Import sources:
 *   - **From Downloads** — Auto-detects the most recent portfolio CSV in ~/Downloads
 *   - **From Clipboard** — Parses CSV content from the system clipboard
 *   - **From File Path** — User enters an absolute path to a CSV file
 *
 * Navigation constraint: no pop()+push() in the same callback.
 * All phase transitions use setState within this single component.
 *
 * @module ImportExportView
 */

import React, { useState, useCallback, useMemo } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Detail,
  Clipboard,
  confirmAlert,
  Alert,
  Form,
  open,
} from "@raycast/api";
import { Portfolio, PortfolioValuation, Account } from "../utils/types";
import {
  exportPortfolioToCsv,
  buildExportData,
  parsePortfolioCsv,
  buildPortfolioFromCsvRows,
  findDuplicates,
  generateExportFilename,
  CsvParseResult,
  CsvImportResult,
  CsvRow,
  ExportPositionData,
} from "../utils/csv-portfolio";
import { COLOR_PRIMARY, COLOR_POSITIVE, COLOR_NEUTRAL, COLOR_WARNING, COLOR_DESTRUCTIVE } from "../utils/constants";
import { writeFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// ──────────────────────────────────────────
// Props
// ──────────────────────────────────────────

interface ImportExportViewProps {
  portfolio: Portfolio | undefined;
  valuation: PortfolioValuation | undefined;
  baseCurrency: string;
  isLoading: boolean;
  onMergeAccounts: (accounts: Account[]) => Promise<void>;
  onRevalidate: () => void;
}

// ──────────────────────────────────────────
// Phase State
// ──────────────────────────────────────────

type Phase =
  | { type: "menu" }
  | { type: "export-done"; csv: string; filename: string; path: string }
  | { type: "import-file-path" }
  | { type: "import-preview"; parseResult: CsvParseResult; sourceLabel: string }
  | { type: "import-done"; importResult: CsvImportResult };

// ──────────────────────────────────────────
// Component
// ──────────────────────────────────────────

export function ImportExportView({
  portfolio,
  valuation,
  // baseCurrency,
  isLoading,
  onMergeAccounts,
  onRevalidate,
}: ImportExportViewProps): React.JSX.Element {
  const [phase, setPhase] = useState<Phase>({ type: "menu" });

  // ── Export Handler ──

  const handleExport = useCallback(async () => {
    if (!portfolio || portfolio.accounts.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Nothing to Export", message: "Your portfolio is empty." });
      return;
    }

    await showToast({ style: Toast.Style.Animated, title: "Exporting…" });

    try {
      // Build price map from valuation
      const priceMap = new Map<string, { price: number; totalValue: number }>();
      if (valuation) {
        for (const av of valuation.accounts) {
          for (const pv of av.positions) {
            priceMap.set(pv.position.id, {
              price: pv.currentPrice,
              totalValue: pv.totalNativeValue,
            });
          }
        }
      }

      const exportData: ExportPositionData[] = buildExportData(portfolio, priceMap);
      const csv = exportPortfolioToCsv(exportData);
      const filename = generateExportFilename();

      // Save to ~/Downloads
      const downloadsDir = join(homedir(), "Downloads");
      if (!existsSync(downloadsDir)) {
        mkdirSync(downloadsDir, { recursive: true });
      }
      const filePath = join(downloadsDir, filename);
      writeFileSync(filePath, csv, "utf-8");

      setPhase({ type: "export-done", csv, filename, path: filePath });

      await showToast({
        style: Toast.Style.Success,
        title: "Export Complete",
        message: `Saved to ~/Downloads/${filename}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Export Failed",
        message: String(error),
      });
    }
  }, [portfolio, valuation]);

  // ── Parse CSV content and transition to preview ──

  const handleParseCsv = useCallback(async (content: string, sourceLabel: string) => {
    await showToast({ style: Toast.Style.Animated, title: "Parsing CSV…" });

    try {
      const parseResult = parsePortfolioCsv(content);

      if (parseResult.rows.length === 0 && parseResult.errors.length > 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Parse Failed",
          message: `${parseResult.errors.length} error${parseResult.errors.length === 1 ? "" : "s"} found. No valid rows.`,
        });
      }

      setPhase({ type: "import-preview", parseResult, sourceLabel });

      if (parseResult.rows.length > 0) {
        await showToast({
          style: Toast.Style.Success,
          title: "CSV Parsed",
          message: `${parseResult.rows.length} position${parseResult.rows.length === 1 ? "" : "s"} ready to import.`,
        });
      }
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Parse Failed", message: String(error) });
    }
  }, []);

  // ── Import from Downloads ──

  const handleImportFromDownloads = useCallback(async () => {
    const downloadsDir = join(homedir(), "Downloads");
    try {
      const files = readdirSync(downloadsDir)
        .filter((f) => f.toLowerCase().endsWith(".csv") && f.toLowerCase().includes("portfolio"))
        .map((f) => ({
          name: f,
          path: join(downloadsDir, f),
          mtime: statSync(join(downloadsDir, f)).mtimeMs,
        }))
        .sort((a, b) => b.mtime - a.mtime);

      if (files.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No CSV Found",
          message: 'No files matching "*portfolio*.csv" found in ~/Downloads.',
        });
        return;
      }

      const content = readFileSync(files[0].path, "utf-8");
      await handleParseCsv(content, files[0].name);
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(error) });
    }
  }, [handleParseCsv]);

  // ── Import from Clipboard ──

  const handleImportFromClipboard = useCallback(async () => {
    const text = await Clipboard.readText();
    if (!text || text.trim().length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard Empty",
        message: "No text content found in clipboard.",
      });
      return;
    }
    await handleParseCsv(text, "Clipboard");
  }, [handleParseCsv]);

  // ── Import from File Path ──

  const handleImportFromPath = useCallback(
    async (filePath: string) => {
      const trimmedPath = filePath.trim().replace(/^~/, homedir());

      if (!trimmedPath) {
        await showToast({ style: Toast.Style.Failure, title: "No Path", message: "Please enter a file path." });
        return;
      }

      if (!existsSync(trimmedPath)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "File Not Found",
          message: `"${trimmedPath}" does not exist.`,
        });
        return;
      }

      if (!trimmedPath.toLowerCase().endsWith(".csv")) {
        await showToast({ style: Toast.Style.Failure, title: "Invalid File", message: "Please select a .csv file." });
        return;
      }

      try {
        const content = readFileSync(trimmedPath, "utf-8");
        const label = trimmedPath.split("/").pop() ?? trimmedPath;
        await handleParseCsv(content, label);
      } catch (error) {
        await showToast({ style: Toast.Style.Failure, title: "Failed to Read", message: String(error) });
      }
    },
    [handleParseCsv],
  );

  // ── Confirm Import Handler ──

  const handleConfirmImport = useCallback(
    async (selectedRows: CsvRow[]) => {
      if (!portfolio) return;

      if (selectedRows.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Nothing Selected",
          message: "No positions selected for import.",
        });
        return;
      }

      const importResult = buildPortfolioFromCsvRows(selectedRows);

      // Check for duplicates among the selected rows
      const duplicates = findDuplicates(portfolio, importResult.portfolio);
      if (duplicates.length > 0) {
        const dupSummary = duplicates
          .slice(0, 5)
          .map((d) => `${d.symbol} in "${d.accountName}"`)
          .join(", ");
        const suffix = duplicates.length > 5 ? ` and ${duplicates.length - 5} more` : "";

        const confirmed = await confirmAlert({
          title: "Duplicate Positions Included",
          message: `These symbols already exist in your portfolio: ${dupSummary}${suffix}. They will be added as new entries alongside existing ones.`,
          primaryAction: { title: "Import Anyway", style: Alert.ActionStyle.Default },
          dismissAction: { title: "Cancel" },
        });

        if (!confirmed) return;
      }

      await showToast({ style: Toast.Style.Animated, title: "Importing…" });

      try {
        await onMergeAccounts(importResult.portfolio.accounts);
        onRevalidate();

        setPhase({ type: "import-done", importResult });

        await showToast({
          style: Toast.Style.Success,
          title: "Import Complete",
          message: importResult.messages[0] ?? "Portfolio updated.",
        });
      } catch (error) {
        await showToast({ style: Toast.Style.Failure, title: "Import Failed", message: String(error) });
      }
    },
    [portfolio, onMergeAccounts, onRevalidate],
  );

  // ── Render based on phase ──

  switch (phase.type) {
    case "menu":
      return (
        <MenuPhase
          portfolio={portfolio}
          isLoading={isLoading}
          onExport={handleExport}
          onImportFromDownloads={handleImportFromDownloads}
          onImportFromClipboard={handleImportFromClipboard}
          onGoToFilePath={() => setPhase({ type: "import-file-path" })}
        />
      );

    case "export-done":
      return <ExportDonePhase csv={phase.csv} filename={phase.filename} filePath={phase.path} setPhase={setPhase} />;

    case "import-file-path":
      return <FilePathPhase onSubmit={handleImportFromPath} setPhase={setPhase} />;

    case "import-preview":
      return (
        <ImportPreviewPhase
          parseResult={phase.parseResult}
          sourceLabel={phase.sourceLabel}
          existingPortfolio={portfolio}
          onConfirm={handleConfirmImport}
          setPhase={setPhase}
        />
      );

    case "import-done":
      return <ImportDonePhase importResult={phase.importResult} setPhase={setPhase} />;
  }
}

// ──────────────────────────────────────────
// Phase: Menu
// ──────────────────────────────────────────

function MenuPhase({
  portfolio,
  isLoading,
  onExport,
  onImportFromDownloads,
  onImportFromClipboard,
  onGoToFilePath,
}: {
  portfolio: Portfolio | undefined;
  isLoading: boolean;
  onExport: () => Promise<void>;
  onImportFromDownloads: () => Promise<void>;
  onImportFromClipboard: () => Promise<void>;
  onGoToFilePath: () => void;
}): React.JSX.Element {
  const positionCount = portfolio?.accounts.reduce((sum, a) => sum + a.positions.length, 0) ?? 0;
  const accountCount = portfolio?.accounts.length ?? 0;

  return (
    <List isLoading={isLoading} navigationTitle="Import / Export Portfolio">
      <List.Section title="Export" subtitle="Save your portfolio to CSV">
        <List.Item
          icon={Icon.Upload}
          title="Export Portfolio to CSV"
          subtitle={`${positionCount} position${positionCount === 1 ? "" : "s"} across ${accountCount} account${accountCount === 1 ? "" : "s"}`}
          accessories={[{ text: "~/Downloads", icon: Icon.Folder }]}
          actions={
            <ActionPanel>
              <Action title="Export to CSV" icon={Icon.Upload} onAction={onExport} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Import" subtitle="Load positions from CSV">
        <List.Item
          icon={Icon.Download}
          title="Import from Downloads"
          subtitle='Auto-detect most recent "portfolio*.csv"'
          accessories={[{ text: "~/Downloads", icon: Icon.Folder }]}
          actions={
            <ActionPanel>
              <Action title="Import from Downloads" icon={Icon.Download} onAction={onImportFromDownloads} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Clipboard}
          title="Import from Clipboard"
          subtitle="Paste CSV content from clipboard"
          actions={
            <ActionPanel>
              <Action
                title="Import from Clipboard"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                onAction={onImportFromClipboard}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.TextDocument}
          title="Import from File Path"
          subtitle="Enter the full path to a CSV file"
          actions={
            <ActionPanel>
              <Action
                title="Enter File Path"
                icon={Icon.TextDocument}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                onAction={onGoToFilePath}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Info">
        <List.Item
          icon={Icon.QuestionMarkCircle}
          title="CSV Format"
          subtitle="Account, Account Type, Asset Name, Symbol, Units, Price, Total Value, Currency, Asset Type, Last Updated"
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Header Row"
                content="Account,Account Type,Asset Name,Symbol,Units,Price,Total Value,Currency,Asset Type,Last Updated"
                shortcut={{ modifiers: ["cmd"], key: "h" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

// ──────────────────────────────────────────
// Phase: File Path Input
// ──────────────────────────────────────────

function FilePathPhase({
  onSubmit,
  setPhase,
}: {
  onSubmit: (path: string) => Promise<void>;
  setPhase: React.Dispatch<React.SetStateAction<Phase>>;
}): React.JSX.Element {
  return (
    <Form
      navigationTitle="Import — Enter File Path"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Import CSV"
            icon={Icon.Download}
            onSubmit={(values: { filePath: string }) => onSubmit(values.filePath)}
          />
          <Action
            title="Back to Menu"
            icon={Icon.ArrowLeft}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            onAction={() => setPhase({ type: "menu" })}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="filePath"
        title="CSV File Path"
        placeholder="/path/to/portfolio.csv  or  ~/Downloads/portfolio-export-2025-07-15.csv"
        info="Enter the absolute path to a CSV file. Supports ~ for home directory."
      />
      <Form.Description title="Required Columns" text="Account, Asset Name, Symbol, Units, Currency" />
      <Form.Description title="Optional Columns" text="Account Type, Price, Total Value, Asset Type, Last Updated" />
    </Form>
  );
}

// ──────────────────────────────────────────
// Phase: Export Done
// ──────────────────────────────────────────

function ExportDonePhase({
  csv,
  filename,
  filePath,
  setPhase,
}: {
  csv: string;
  filename: string;
  filePath: string;
  setPhase: React.Dispatch<React.SetStateAction<Phase>>;
}): React.JSX.Element {
  const lineCount = csv.split("\n").length;
  const positionCount = lineCount - 1; // Subtract header

  // Build a preview of the first 10 data rows
  const allLines = csv.split("\n");
  const previewLines = allLines.slice(0, 11);
  const remaining = allLines.length - 11;

  const markdown = [
    "# ✅ Export Complete",
    "",
    `**File:** \`${filename}\``,
    "**Location:** `~/Downloads/`",
    `**Positions:** ${positionCount}`,
    `**Size:** ${(csv.length / 1024).toFixed(1)} KB`,
    "",
    "---",
    "",
    "### Preview (first 10 rows)",
    "",
    "```",
    ...previewLines,
    "```",
    "",
    remaining > 0 ? `*…and ${remaining} more rows*` : "",
  ].join("\n");

  return (
    <Detail
      navigationTitle="Export Complete"
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Open in Finder" icon={Icon.Finder} onAction={() => open(filePath)} />
          <Action
            title="Copy CSV to Clipboard"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            onAction={async () => {
              await Clipboard.copy(csv);
              await showToast({ style: Toast.Style.Success, title: "Copied to Clipboard" });
            }}
          />
          <Action
            title="Back to Menu"
            icon={Icon.ArrowLeft}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            onAction={() => setPhase({ type: "menu" })}
          />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="File" text={filename} icon={Icon.Document} />
          <Detail.Metadata.Label title="Location" text="~/Downloads/" icon={Icon.Folder} />
          <Detail.Metadata.Label title="Positions" text={String(positionCount)} icon={Icon.List} />
          <Detail.Metadata.Label title="Size" text={`${(csv.length / 1024).toFixed(1)} KB`} icon={Icon.HardDrive} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Format" text="CSV (RFC 4180)" icon={Icon.TextDocument} />
          <Detail.Metadata.Label title="Encoding" text="UTF-8" icon={Icon.Text} />
        </Detail.Metadata>
      }
    />
  );
}

// ──────────────────────────────────────────
// Phase: Import Preview
// ──────────────────────────────────────────

/** Map asset type strings to Raycast icons for the import preview list */
const IMPORT_ASSET_TYPE_ICONS: Record<string, Icon> = {
  EQUITY: Icon.Building,
  ETF: Icon.BarChart,
  MUTUALFUND: Icon.BankNote,
  INDEX: Icon.LineChart,
  CURRENCY: Icon.Coins,
  CRYPTOCURRENCY: Icon.Crypto,
  OPTION: Icon.Switch,
  FUTURE: Icon.Calendar,
  CASH: Icon.BankNote,
  MORTGAGE: Icon.House,
  OWNED_PROPERTY: Icon.House,
  CREDIT_CARD: Icon.CreditCard,
  LOAN: Icon.BankNote,
  STUDENT_LOAN: Icon.Book,
  AUTO_LOAN: Icon.Car,
  BNPL: Icon.CreditCard,
  UNKNOWN: Icon.QuestionMarkCircle,
};

function ImportPreviewPhase({
  parseResult,
  sourceLabel,
  existingPortfolio,
  onConfirm,
  setPhase,
}: {
  parseResult: CsvParseResult;
  sourceLabel: string;
  existingPortfolio: Portfolio | undefined;
  onConfirm: (selectedRows: CsvRow[]) => Promise<void>;
  setPhase: React.Dispatch<React.SetStateAction<Phase>>;
}): React.JSX.Element {
  const { rows, errors, skipped } = parseResult;
  const hasErrors = errors.length > 0;
  const hasSkipped = skipped.length > 0;

  // ── Compute duplicate set from parsed rows ──
  // Build a temporary import result to check duplicates
  const duplicateSet = useMemo(() => {
    const tempResult = buildPortfolioFromCsvRows(rows);
    const duplicates = existingPortfolio ? findDuplicates(existingPortfolio, tempResult.portfolio) : [];
    // Build a Set of "accountName::symbol" keys for O(1) lookup
    const set = new Set<string>();
    for (const dup of duplicates) {
      set.add(`${dup.accountName.toLowerCase()}::${dup.symbol.toUpperCase()}`);
    }
    return set;
  }, [rows, existingPortfolio]);

  // ── Selection state: track deselected indices (most rows start selected) ──
  // Duplicates start deselected, everything else starts selected
  const [deselected, setDeselected] = useState<Set<number>>(() => {
    const initial = new Set<number>();
    for (let i = 0; i < rows.length; i++) {
      const key = `${rows[i].accountName.toLowerCase()}::${rows[i].symbol.toUpperCase()}`;
      if (duplicateSet.has(key)) {
        initial.add(i);
      }
    }
    return initial;
  });

  const selectedCount = rows.length - deselected.size;
  const accountSet = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < rows.length; i++) {
      if (!deselected.has(i)) {
        set.add(rows[i].accountName);
      }
    }
    return set;
  }, [rows, deselected]);

  const toggleRow = useCallback((index: number) => {
    setDeselected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setDeselected(new Set());
  }, []);

  const deselectAll = useCallback(() => {
    setDeselected(new Set(rows.map((_, i) => i)));
  }, [rows]);

  // ── Build summary line ──
  const errorSuffix = hasErrors ? `, ${errors.length} error${errors.length === 1 ? "" : "s"}` : "";
  const skippedSuffix = hasSkipped ? `, ${skipped.length} skipped` : "";
  const dupCount = duplicateSet.size;
  const dupSuffix = dupCount > 0 ? `, ${dupCount} duplicate${dupCount === 1 ? "" : "s"}` : "";
  const summaryText = `${rows.length} position${rows.length === 1 ? "" : "s"} read over ${accountSet.size} account${accountSet.size === 1 ? "" : "s"}${errorSuffix}${skippedSuffix}${dupSuffix}`;

  const handleConfirm = useCallback(() => {
    const selectedRows = rows.filter((_, i) => !deselected.has(i));
    onConfirm(selectedRows);
  }, [rows, deselected, onConfirm]);

  return (
    <List navigationTitle="Import Preview">
      {/* ── Summary Row ── */}
      <List.Section title="Summary">
        <List.Item
          icon={{ source: Icon.Document, tintColor: COLOR_PRIMARY }}
          title={summaryText}
          subtitle={`Source: ${sourceLabel}`}
          accessories={[{ text: `${selectedCount} selected`, icon: Icon.Checkmark }]}
          actions={
            <ActionPanel>
              {selectedCount > 0 && (
                <Action
                  title={`Import ${selectedCount} Position${selectedCount === 1 ? "" : "s"}`}
                  icon={Icon.Download}
                  onAction={handleConfirm}
                />
              )}
              <Action
                title="Select All"
                icon={Icon.CheckCircle}
                shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                onAction={selectAll}
              />
              <Action
                title="Deselect All"
                icon={Icon.Circle}
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                onAction={deselectAll}
              />
              <Action
                title="Back to Menu"
                icon={Icon.ArrowLeft}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                onAction={() => setPhase({ type: "menu" })}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {/* ── Position Rows ── */}
      {rows.length > 0 && (
        <List.Section title="Positions" subtitle={`${selectedCount} of ${rows.length} selected`}>
          {rows.map((row, index) => {
            const isSelected = !deselected.has(index);
            const isDuplicate = duplicateSet.has(`${row.accountName.toLowerCase()}::${row.symbol.toUpperCase()}`);
            const assetIcon = IMPORT_ASSET_TYPE_ICONS[row.assetType.toUpperCase()] ?? Icon.QuestionMarkCircle;

            const titlePrefix = isDuplicate ? "⚠️ " : "";
            const title = `${titlePrefix}${row.assetName}`;
            const subtitle = `${row.symbol} · ${row.units} units · ${row.currency}`;

            return (
              <List.Item
                key={`pos-${index}`}
                icon={
                  isSelected
                    ? { source: Icon.Checkmark, tintColor: COLOR_POSITIVE }
                    : { source: Icon.Circle, tintColor: COLOR_NEUTRAL }
                }
                title={title}
                subtitle={subtitle}
                accessories={[
                  ...(isDuplicate
                    ? [
                        {
                          tag: { value: "duplicate", color: COLOR_WARNING },
                          tooltip: `Already exists in "${row.accountName}"`,
                        },
                      ]
                    : []),
                  { text: row.accountName, icon: assetIcon },
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title={isSelected ? "Deselect" : "Select"}
                      icon={isSelected ? Icon.Circle : Icon.Checkmark}
                      onAction={() => toggleRow(index)}
                    />
                    {selectedCount > 0 && (
                      <Action
                        title={`Import ${selectedCount} Position${selectedCount === 1 ? "" : "s"}`}
                        icon={Icon.Download}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
                        onAction={handleConfirm}
                      />
                    )}
                    <Action
                      title="Select All"
                      icon={Icon.CheckCircle}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                      onAction={selectAll}
                    />
                    <Action
                      title="Deselect All"
                      icon={Icon.Circle}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                      onAction={deselectAll}
                    />
                    <Action
                      title="Back to Menu"
                      icon={Icon.ArrowLeft}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      onAction={() => setPhase({ type: "menu" })}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {/* ── Errors ── */}
      {hasErrors && (
        <List.Section title="❌ Errors" subtitle={`${errors.length} error${errors.length === 1 ? "" : "s"}`}>
          {errors.slice(0, 20).map((err, index) => {
            const rawVal = err.rawValue ? ` (got: "${err.rawValue}")` : "";
            return (
              <List.Item
                key={`err-${index}`}
                icon={{ source: Icon.XMarkCircle, tintColor: COLOR_DESTRUCTIVE }}
                title={`Row ${err.row}: ${err.message}${rawVal}`}
                subtitle={err.column}
              />
            );
          })}
          {errors.length > 20 && <List.Item icon={Icon.Ellipsis} title={`…and ${errors.length - 20} more errors`} />}
        </List.Section>
      )}

      {/* ── Skipped ── */}
      {hasSkipped && (
        <List.Section title="⏭️ Skipped" subtitle={`${skipped.length} skipped`}>
          {skipped.slice(0, 15).map((skip, index) => (
            <List.Item
              key={`skip-${index}`}
              icon={{ source: Icon.ArrowRightCircle, tintColor: COLOR_NEUTRAL }}
              title={`Row ${skip.row}`}
              subtitle={skip.reason}
            />
          ))}
          {skipped.length > 15 && <List.Item icon={Icon.Ellipsis} title={`…and ${skipped.length - 15} more skipped`} />}
        </List.Section>
      )}
    </List>
  );
}

// ──────────────────────────────────────────
// Phase: Import Done
// ──────────────────────────────────────────

function ImportDonePhase({
  importResult,
  setPhase,
}: {
  importResult: CsvImportResult;
  setPhase: React.Dispatch<React.SetStateAction<Phase>>;
}): React.JSX.Element {
  const markdown = [
    "# ✅ Import Complete",
    "",
    importResult.messages.map((m) => `> ${m}`).join("\n"),
    "",
    "---",
    "",
    `**Accounts:** ${importResult.accountCount}`,
    `**Positions:** ${importResult.positionCount}`,
    "",
    "Your portfolio has been updated. Switch to the **Portfolio Tracker** command to see your imported positions.",
    "",
    "*Prices will be fetched automatically when you open Portfolio Tracker.*",
  ].join("\n");

  return (
    <Detail
      navigationTitle="Import Complete"
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Back to Menu" icon={Icon.ArrowLeft} onAction={() => setPhase({ type: "menu" })} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Accounts" text={String(importResult.accountCount)} icon={Icon.TwoPeople} />
          <Detail.Metadata.Label title="Positions" text={String(importResult.positionCount)} icon={Icon.List} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Status" text="Complete" icon={Icon.Checkmark} />
        </Detail.Metadata>
      }
    />
  );
}
