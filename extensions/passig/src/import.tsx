/**
 * Comando «Importa password»: legge un file di export di un altro password
 * manager, lo converte in memoria (in questo processo) e carica gli elementi
 * cifrati con la vaultKey del vault di destinazione. Il server non vede mai il
 * contenuto in chiaro. Per i CSV generici si usa la mappatura delle colonne
 * indovinata dalle intestazioni (la mappatura manuale è nelle app desktop/Chrome).
 */
import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  Form,
  Icon,
  Toast,
  confirmAlert,
  popToRoot,
  showToast,
  trash,
  useNavigation,
} from "@raycast/api";
import { readFileSync, statSync } from "node:fs";
import { basename } from "node:path";
import { useMemo, useState } from "react";
import {
  IMPORT_FORMATS,
  ImportFailedError,
  PlanLimitError,
  detectFormat,
  guessCsvMapping,
  isUsableMapping,
  parseImport,
  planImport,
  previewCsv,
  summarizeImport,
  type CsvMapping,
  type CsvTarget,
  type ImportFormatId,
  type ImportFormatInfo,
  type ImportPlan,
  type ImportReport,
  type ImportResult,
} from "./vendor/client-core/index.js";
import type { BillingStatus, ItemData } from "./vendor/shared/index.js";
import { UnlockForm } from "./components/UnlockForm";
import { formatNumber, t, type MessageKey } from "./i18n";
import { BillingActions, fetchBilling, personalVaultIds } from "./lib/billing";
import { describeError } from "./lib/errors";
import { checkImportAgainstPlan } from "./lib/plan";
import type { ActiveSession } from "./lib/session";
import { useSession } from "./lib/useSession";

const MAX_FILE_BYTES = 100 * 1024 * 1024;

const TARGET_LABELS: Record<CsvTarget, MessageKey> = {
  title: "import.target.title",
  username: "import.target.username",
  password: "import.target.password",
  url: "import.target.url",
  notes: "import.target.notes",
  totp: "import.target.totp",
  folder: "import.target.folder",
  favorite: "import.target.favorite",
  field: "import.target.field",
  ignore: "import.target.ignore",
};

/** Nome del password manager di origine (i nomi propri restano, le voci generiche sono tradotte). */
function formatSource(f: ImportFormatInfo): string {
  if (f.id === "generic-csv") return t("import.source.generic");
  if (f.id === "safari-csv") return t("import.source.safari");
  return f.source;
}

/** Istruzioni di export localizzate (`import.howTo.<id>`), con fallback al testo del catalogo. */
function formatHowTo(f: ImportFormatInfo): string {
  const key = `import.howTo.${f.id}` as MessageKey;
  const text = t(key);
  return text === key ? f.howTo : text;
}

interface FormValues {
  file: string[];
  format: string;
  vault: string;
  perFolder: boolean;
  skipDuplicates: boolean;
}

export default function ImportCommand() {
  const { session, setSession, loading } = useSession();
  if (loading) return <Form isLoading />;
  if (!session) return <UnlockForm onUnlocked={setSession} />;
  return <ImportForm session={session} />;
}

/** Escape minimo per testo dell'utente inserito nel markdown del Detail. */
function md(text: string): string {
  return text.replace(/([\\`*_[\]<>#|])/g, "\\$1");
}

function ImportForm({ session }: { session: ActiveSession }) {
  const { push } = useNavigation();
  const vaults = useMemo(() => session.vault.listWritableVaults(), [session]);
  const [format, setFormat] = useState("auto");
  const [fileError, setFileError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const info = IMPORT_FORMATS.find((f) => f.id === format);

  async function submit(values: FormValues) {
    const path = values.file[0];
    if (!path) {
      setFileError(t("import.chooseFile"));
      return;
    }
    if (!values.vault) {
      await showToast({ style: Toast.Style.Failure, title: t("common.noWritableVault") });
      return;
    }
    setBusy(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: t("import.readingFile") });
    let bytes: Uint8Array | null = null;
    try {
      if (statSync(path).size > MAX_FILE_BYTES) throw new Error(t("import.fileTooLarge"));
      bytes = new Uint8Array(readFileSync(path));
      const file = { name: basename(path), bytes };
      const resolved: ImportFormatId =
        values.format === "auto" ? detectFormat(file) : (values.format as ImportFormatId);

      let mapping: CsvMapping | undefined;
      if (resolved === "generic-csv") {
        mapping = guessCsvMapping(previewCsv(file, 0).headers);
        if (!isUsableMapping(mapping)) {
          throw new Error(t("import.csvMappingFailed"));
        }
      }
      const result = parseImport(file, { format: resolved, ...(mapping ? { mapping } : {}) });

      const existing = new Map<string, ItemData[]>();
      for (const it of session.vault.listItems()) {
        const list = existing.get(it.vaultId);
        if (list) list.push(it.data);
        else existing.set(it.vaultId, [it.data]);
      }
      const plan = planImport(result.items, vaults, existing, {
        targetVaultId: values.vault,
        folders: values.perFolder ? "per-folder" : "single",
        skipDuplicates: values.skipDuplicates,
      });
      await toast.hide();
      if (mapping) {
        await showToast({
          style: Toast.Style.Success,
          title: t("import.genericCsv"),
          message: t("import.columnsMapped"),
        });
      }
      // controllo preventivo del piano: un import che sfora viene rifiutato per intero dal server (402)
      const billing = await fetchBilling(session);
      const check = billing
        ? checkImportAgainstPlan(billing, plan, personalVaultIds(session.vault))
        : ({ ok: true } as const);
      push(
        <ImportPreview
          session={session}
          path={path}
          result={result}
          plan={plan}
          mapping={mapping}
          billing={billing}
          blocked={check.ok ? null : check.message}
        />,
      );
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = t("import.readFailed");
      toast.message = describeError(err);
    } finally {
      // i byte del file non servono più: il risultato in chiaro vive solo nell'anteprima
      bytes?.fill(0);
      setBusy(false);
    }
  }

  return (
    <Form
      isLoading={busy}
      navigationTitle={t("import.navTitle")}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("import.preview")} icon={Icon.Eye} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text={t("import.description")} />
      <Form.FilePicker
        id="file"
        title={t("import.file")}
        allowMultipleSelection={false}
        canChooseDirectories={false}
        error={fileError}
        onChange={() => setFileError(undefined)}
      />
      <Form.Dropdown id="format" title={t("import.format")} value={format} onChange={setFormat}>
        <Form.Dropdown.Item value="auto" title={t("import.autoDetect")} icon={Icon.MagnifyingGlass} />
        {IMPORT_FORMATS.map((f) => (
          <Form.Dropdown.Item key={f.id} value={f.id} title={`${formatSource(f)} — ${f.label}`} />
        ))}
      </Form.Dropdown>
      {info && <Form.Description title={t("import.howTo")} text={formatHowTo(info)} />}
      <Form.Separator />
      {vaults.length === 0 ? (
        <Form.Description title={t("import.destination")} text={t("common.noWritableVaultText")} />
      ) : (
        <Form.Dropdown id="vault" title={t("import.targetVault")} defaultValue={vaults[0]?.id}>
          {vaults.map((v) => (
            <Form.Dropdown.Item
              key={v.id}
              value={v.id}
              title={v.name}
              icon={v.organizationId ? Icon.TwoPeople : Icon.Person}
            />
          ))}
        </Form.Dropdown>
      )}
      <Form.Checkbox
        id="perFolder"
        label={t("import.perFolder")}
        defaultValue={false}
        info={t("import.perFolderInfo")}
      />
      <Form.Checkbox
        id="skipDuplicates"
        label={t("import.skipDuplicates")}
        defaultValue={true}
        info={t("import.skipDuplicatesInfo")}
      />
    </Form>
  );
}

type Phase =
  | { kind: "preview" }
  | { kind: "running" }
  | { kind: "done"; report: ImportReport; error?: string; planLimit?: boolean };

function ImportPreview(props: {
  session: ActiveSession;
  path: string;
  result: ImportResult;
  plan: ImportPlan;
  mapping?: CsvMapping;
  billing: BillingStatus | null;
  /** messaggio se l'import supera il piano (nessun caricamento possibile) */
  blocked: string | null;
}) {
  const { session, path, billing, blocked } = props;
  // risultato e piano contengono dati in chiaro: li teniamo in stato e li azzeriamo a import concluso
  const [data, setData] = useState<{ result: ImportResult; plan: ImportPlan; mapping?: CsvMapping } | null>({
    result: props.result,
    plan: props.plan,
    mapping: props.mapping,
  });
  const [phase, setPhase] = useState<Phase>({ kind: "preview" });

  const vaultNames = useMemo(() => new Map(session.vault.listVaults().map((v) => [v.id, v.name])), [session]);

  async function run() {
    if (!data || data.plan.total === 0 || blocked) return;
    const plan = data.plan;
    setPhase({ kind: "running" });
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: t("import.running"),
      message: t("import.progress", { done: 0, total: plan.total }),
    });
    try {
      const report = await session.vault.importPlan(plan, (p) => {
        toast.message = t("import.progressVault", { done: p.done, total: p.total, vault: p.vaultName });
      });
      session.persist();
      toast.style = Toast.Style.Success;
      toast.title = t("import.completed");
      toast.message = t("import.itemsImported", { count: report.created });
      setPhase({ kind: "done", report });
    } catch (err) {
      session.persist(); // i blocchi già caricati restano: aggiorna la cache
      const report = err instanceof ImportFailedError ? err.report : { created: 0, vaultsCreated: [] };
      const cause = err instanceof ImportFailedError ? err.cause : err;
      toast.style = Toast.Style.Failure;
      toast.title = t("import.interrupted");
      toast.message = describeError(cause);
      setPhase({ kind: "done", report, error: describeError(err), planLimit: cause instanceof PlanLimitError });
    } finally {
      plan.batches.length = 0;
      setData(null);
    }
  }

  async function trashExport() {
    const ok = await confirmAlert({
      title: t("import.trashConfirm"),
      message: basename(path),
      primaryAction: { title: t("import.trashAction"), style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    try {
      await trash(path);
      await showToast({
        style: Toast.Style.Success,
        title: t("import.trashed"),
        message: t("import.emptyTrash"),
      });
    } catch (err) {
      await showToast({ style: Toast.Style.Failure, title: t("import.trashFailed"), message: describeError(err) });
    }
  }

  if (phase.kind === "done") {
    const { report, error } = phase;
    const imported = t("import.itemsImported", { count: report.created });
    const lines = [
      error ? `# ${t("import.interrupted")}` : `# ${t("import.completed")}`,
      "",
      error ? `${md(error)}\n` : "",
      error && report.created ? t("import.importedBeforeError", { imported }) : t("import.importedLine", { imported }),
      "",
      report.vaultsCreated.length
        ? `${t("import.vaultsCreated", { names: report.vaultsCreated.map(md).join(", ") })}\n`
        : "",
      t("import.deleteReminder"),
    ];
    return (
      <Detail
        navigationTitle={t("import.navTitle")}
        markdown={lines.join("\n")}
        actions={
          <ActionPanel>
            <Action
              title={t("import.trashFile")}
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={trashExport}
            />
            <Action title={t("common.close")} icon={Icon.Checkmark} onAction={() => popToRoot()} />
            {phase.planLimit && <BillingActions session={session} billing={billing} />}
          </ActionPanel>
        }
      />
    );
  }

  if (!data) return <Detail isLoading markdown="" />;

  const { result, plan, mapping } = data;
  const s = summarizeImport(result.items);
  const fmt = IMPORT_FORMATS.find((f) => f.id === result.format);
  const n = formatNumber;
  const md_ = [
    `# ${t("import.previewTitle")}`,
    "",
    t("import.fileAndFormat", {
      file: md(basename(path)),
      format: md(fmt ? `${formatSource(fmt)} (${fmt.label})` : result.format),
    }),
    "",
    t("import.tableHeader"),
    "|---:|---:|---:|---:|---:|---:|",
    `| ${n(s.login)} | ${n(s.note)} | ${n(s.card)} | ${n(s.identity)} | ${n(s.folders)} | ${n(result.skipped)} |`,
    "",
    `${t("import.willCreate", { count: plan.total })}${plan.duplicates ? ` · ${t("import.duplicatesSkipped", { count: plan.duplicates })}` : ""}.`,
    "",
    ...plan.batches.map(
      (b) =>
        `- ${md(b.vaultId ? (vaultNames.get(b.vaultId) ?? b.vaultId) : (b.newVaultName ?? t("import.defaultVaultName")))}${b.vaultId ? "" : ` _${t("import.newVault")}_`}: ${n(b.items.length)}`,
    ),
    "",
  ];
  if (mapping) {
    md_.push(
      `## ${t("import.csvColumnsTitle")}`,
      "",
      t("import.csvTableHeader"),
      "|---|---|",
      ...mapping.headers.map(
        (h, i) =>
          `| ${md(h || t("import.columnN", { n: i + 1 }))} | ${t(TARGET_LABELS[mapping.columns[i] ?? "ignore"])} |`,
      ),
      "",
      t("import.csvMappingHint"),
      "",
    );
  }
  if (result.warnings.length)
    md_.push(`## ${t("import.warnings")}`, "", ...result.warnings.map((w) => `- ${md(w)}`), "");
  if (plan.total === 0) md_.push(t("import.nothing"), "");
  if (blocked) md_.splice(2, 0, t("import.overPlan", { message: md(blocked) }), "");

  return (
    <Detail
      navigationTitle={t("import.navTitle")}
      isLoading={phase.kind === "running"}
      markdown={md_.join("\n")}
      actions={
        phase.kind === "preview" ? (
          <ActionPanel>
            {blocked && <BillingActions session={session} billing={billing} />}
            {plan.total > 0 && !blocked && (
              <Action title={t("import.run", { count: plan.total })} icon={Icon.Download} onAction={run} />
            )}
            <Action
              title={t("common.cancel")}
              icon={Icon.XMarkCircle}
              onAction={() => {
                setData(null);
                void popToRoot();
              }}
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
