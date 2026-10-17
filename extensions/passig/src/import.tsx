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
  type ImportPlan,
  type ImportReport,
  type ImportResult,
} from "./vendor/client-core/index.js";
import type { ItemData } from "./vendor/shared/index.js";
import { UnlockForm } from "./components/UnlockForm";
import { describeError } from "./lib/errors";
import type { ActiveSession } from "./lib/session";
import { useSession } from "./lib/useSession";

const MAX_FILE_BYTES = 100 * 1024 * 1024;

const TARGET_LABELS: Record<CsvTarget, string> = {
  title: "Titolo",
  username: "Username",
  password: "Password",
  url: "URL",
  notes: "Note",
  totp: "TOTP",
  folder: "Cartella",
  favorite: "Preferito",
  field: "Campo personalizzato",
  ignore: "Ignorata",
};

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

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
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
      setFileError("Scegli il file di export");
      return;
    }
    if (!values.vault) {
      await showToast({ style: Toast.Style.Failure, title: "Nessun vault scrivibile" });
      return;
    }
    setBusy(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Lettura del file…" });
    let bytes: Uint8Array | null = null;
    try {
      if (statSync(path).size > MAX_FILE_BYTES) throw new Error("File troppo grande (massimo 100 MB)");
      bytes = new Uint8Array(readFileSync(path));
      const file = { name: basename(path), bytes };
      const resolved: ImportFormatId = values.format === "auto" ? detectFormat(file) : (values.format as ImportFormatId);

      let mapping: CsvMapping | undefined;
      if (resolved === "generic-csv") {
        mapping = guessCsvMapping(previewCsv(file, 0).headers);
        if (!isUsableMapping(mapping)) {
          throw new Error(
            "Non riesco a capire le colonne del CSV: rinomina le intestazioni (es. title, username, password, url) oppure usa l'estensione Chrome per la mappatura manuale.",
          );
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
          title: "CSV generico",
          message: "Colonne mappate automaticamente: controlla l'anteprima",
        });
      }
      push(<ImportPreview session={session} path={path} result={result} plan={plan} mapping={mapping} />);
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Impossibile leggere il file";
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
      navigationTitle="Importa password"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Anteprima" icon={Icon.Eye} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Il file viene letto e convertito su questo Mac; ogni elemento è cifrato prima di essere inviato al server." />
      <Form.FilePicker
        id="file"
        title="File di export"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        error={fileError}
        onChange={() => setFileError(undefined)}
      />
      <Form.Dropdown id="format" title="Formato" value={format} onChange={setFormat}>
        <Form.Dropdown.Item value="auto" title="Riconoscimento automatico" icon={Icon.MagnifyingGlass} />
        {IMPORT_FORMATS.map((f) => (
          <Form.Dropdown.Item key={f.id} value={f.id} title={`${f.source} — ${f.label}`} />
        ))}
      </Form.Dropdown>
      {info && <Form.Description title="Come esportare" text={info.howTo} />}
      <Form.Separator />
      {vaults.length === 0 ? (
        <Form.Description title="Destinazione" text="Non hai vault con permesso di scrittura." />
      ) : (
        <Form.Dropdown id="vault" title="Vault di destinazione" defaultValue={vaults[0]?.id}>
          {vaults.map((v) => (
            <Form.Dropdown.Item key={v.id} value={v.id} title={v.name} icon={v.organizationId ? Icon.TwoPeople : Icon.Person} />
          ))}
        </Form.Dropdown>
      )}
      <Form.Checkbox
        id="perFolder"
        label="Un vault per ogni cartella"
        defaultValue={false}
        info="Ogni cartella del file diventa un vault (riusato se ne esiste già uno con lo stesso nome); gli elementi senza cartella vanno nel vault scelto."
      />
      <Form.Checkbox
        id="skipDuplicates"
        label="Salta i duplicati"
        defaultValue={true}
        info="Non importa gli elementi già presenti nel vault di destinazione o ripetuti nel file."
      />
    </Form>
  );
}

type Phase = { kind: "preview" } | { kind: "running" } | { kind: "done"; report: ImportReport; error?: string };

function ImportPreview(props: {
  session: ActiveSession;
  path: string;
  result: ImportResult;
  plan: ImportPlan;
  mapping?: CsvMapping;
}) {
  const { session, path } = props;
  // risultato e piano contengono dati in chiaro: li teniamo in stato e li azzeriamo a import concluso
  const [data, setData] = useState<{ result: ImportResult; plan: ImportPlan; mapping?: CsvMapping } | null>({
    result: props.result,
    plan: props.plan,
    mapping: props.mapping,
  });
  const [phase, setPhase] = useState<Phase>({ kind: "preview" });

  const vaultNames = useMemo(() => new Map(session.vault.listVaults().map((v) => [v.id, v.name])), [session]);

  async function run() {
    if (!data || data.plan.total === 0) return;
    const plan = data.plan;
    setPhase({ kind: "running" });
    const toast = await showToast({ style: Toast.Style.Animated, title: "Importazione…", message: `0 di ${plan.total}` });
    try {
      const report = await session.vault.importPlan(plan, (p) => {
        toast.message = `${p.done} di ${p.total} · ${p.vaultName}`;
      });
      session.persist();
      toast.style = Toast.Style.Success;
      toast.title = "Importazione completata";
      toast.message = plural(report.created, "elemento importato", "elementi importati");
      setPhase({ kind: "done", report });
    } catch (err) {
      session.persist(); // i blocchi già caricati restano: aggiorna la cache
      const report = err instanceof ImportFailedError ? err.report : { created: 0, vaultsCreated: [] };
      toast.style = Toast.Style.Failure;
      toast.title = "Importazione interrotta";
      toast.message = describeError(err instanceof ImportFailedError ? err.cause : err);
      setPhase({ kind: "done", report, error: describeError(err) });
    } finally {
      plan.batches.length = 0;
      setData(null);
    }
  }

  async function trashExport() {
    const ok = await confirmAlert({
      title: "Spostare il file di export nel Cestino?",
      message: basename(path),
      primaryAction: { title: "Sposta nel Cestino", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    try {
      await trash(path);
      await showToast({
        style: Toast.Style.Success,
        title: "File spostato nel Cestino",
        message: "Ricorda di svuotare il Cestino",
      });
    } catch (err) {
      await showToast({ style: Toast.Style.Failure, title: "Impossibile spostare il file", message: describeError(err) });
    }
  }

  const deleteReminder =
    "> **Elimina il file di export:** contiene tutte le tue password in chiaro. Spostalo nel Cestino (⌘⌫) e svuota il Cestino.";

  if (phase.kind === "done") {
    const { report, error } = phase;
    const lines = [
      error ? `# Importazione interrotta` : `# Importazione completata`,
      "",
      error ? `${md(error)}\n` : "",
      `**${plural(report.created, "elemento importato", "elementi importati")}**${error && report.created ? " prima dell'errore: restano nel vault. Se riprovi, lascia attivo «Salta i duplicati»." : "."}`,
      "",
      report.vaultsCreated.length ? `Vault creati: ${report.vaultsCreated.map(md).join(", ")}\n` : "",
      deleteReminder,
    ];
    return (
      <Detail
        navigationTitle="Importa password"
        markdown={lines.join("\n")}
        actions={
          <ActionPanel>
            <Action
              title="Sposta il file nel Cestino"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={trashExport}
            />
            <Action title="Chiudi" icon={Icon.Checkmark} onAction={() => popToRoot()} />
          </ActionPanel>
        }
      />
    );
  }

  if (!data) return <Detail isLoading markdown="" />;

  const { result, plan, mapping } = data;
  const s = summarizeImport(result.items);
  const fmt = IMPORT_FORMATS.find((f) => f.id === result.format);
  const md_ = [
    `# Anteprima import`,
    "",
    `**File:** ${md(basename(path))} · **Formato:** ${md(fmt ? `${fmt.source} (${fmt.label})` : result.format)}`,
    "",
    "| Login | Note | Carte | Identità | Cartelle | Scartati |",
    "|---:|---:|---:|---:|---:|---:|",
    `| ${s.login} | ${s.note} | ${s.card} | ${s.identity} | ${s.folders} | ${result.skipped} |`,
    "",
    `Verranno creati **${plural(plan.total, "elemento", "elementi")}**${plan.duplicates ? ` · ${plural(plan.duplicates, "duplicato saltato", "duplicati saltati")}` : ""}.`,
    "",
    ...plan.batches.map(
      (b) =>
        `- ${md(b.vaultId ? (vaultNames.get(b.vaultId) ?? b.vaultId) : (b.newVaultName ?? "Importati"))}${b.vaultId ? "" : " _(nuovo vault)_"}: ${b.items.length}`,
    ),
    "",
  ];
  if (mapping) {
    md_.push(
      "## Colonne del CSV (mappatura automatica)",
      "",
      "| Colonna | Campo |",
      "|---|---|",
      ...mapping.headers.map((h, i) => `| ${md(h || `Colonna ${i + 1}`)} | ${TARGET_LABELS[mapping.columns[i] ?? "ignore"]} |`),
      "",
      "Se la mappatura non è corretta, rinomina le intestazioni del CSV oppure usa l'estensione Chrome per sceglierla a mano.",
      "",
    );
  }
  if (result.warnings.length) md_.push("## Avvisi", "", ...result.warnings.map((w) => `- ${md(w)}`), "");
  if (plan.total === 0) md_.push("**Niente da importare:** tutti gli elementi sono già presenti.", "");

  return (
    <Detail
      navigationTitle="Importa password"
      isLoading={phase.kind === "running"}
      markdown={md_.join("\n")}
      actions={
        phase.kind === "preview" ? (
          <ActionPanel>
            {plan.total > 0 && (
              <Action title={`Importa ${plural(plan.total, "elemento", "elementi")}`} icon={Icon.Download} onAction={run} />
            )}
            <Action
              title="Annulla"
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
