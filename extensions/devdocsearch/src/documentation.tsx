import { Action, ActionPanel, Alert, Form, Icon, List, Toast, confirmAlert, showToast, trash, environment } from "@raycast/api";
import { useEffect, useState } from "react";
import type { CrawlProgress } from "./docs";
import { importDocumentation, listCollections, type Collection } from "./store";
import { collectionPaths, renameCollection } from "./library";
import { canAutoIndex, isSemanticIndexPaused, isSemanticIndexRunning, LOCAL_MODEL_ID, pauseSemanticBackfill, resetSemanticWorker, resumeSemanticBackfill, semanticIndexStatus, startSemanticBackfill, startSemanticIndex } from "./semantic";
import { defaultEmbeddingConfig, readEmbeddingConfig, saveEmbeddingConfig, type EmbeddingConfig } from "./embedding-config";
import { discoverDownloadedModels, discoverServerModels, type AvailableModel, type DownloadedModel } from "./model-discovery";
import { access } from "node:fs/promises";

const LOCAL_FIRECRAWL = "http://127.0.0.1:30001";
type ImportValues = { url: string; engine: "built-in" | "firecrawl"; firecrawlUrl: string };

function ImportDocs({ onImported, onDone, initialUrl = "" }: { onImported: () => Promise<void>; onDone: () => void; initialUrl?: string }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("Ready to download and index pages.");

  async function submit({ url, engine, firecrawlUrl }: ImportValues) {
    if (busy) return;
    setBusy(true);
    try {
      const normalized = new URL(url.trim()).toString();
      const localEndpoint = firecrawlUrl.trim();
      const update = ({ done, queued, current }: CrawlProgress) => setProgress(`${done} pages downloaded · ${queued} queued · ${current}`);
      setProgress(engine === "firecrawl" ? "Starting local Firecrawl…" : "Discovering documentation pages…");
      const collection = await importDocumentation({ rootUrl: normalized, engine, firecrawlUrl: localEndpoint }, update);
      const indexing = await startSemanticIndex(collection, environment.assetsPath);
      await onImported();
      const skipped = collection.skipped?.length ?? 0;
      await showToast({
        style: Toast.Style.Success,
        title: `Indexed ${collection.pageCount} pages`,
        message: `${engine === "firecrawl" ? "Local Firecrawl" : "Built-in crawler"} · saved to ~/.context/docs${indexing ? " · semantic index building locally" : ""}${skipped ? ` · ${skipped} unavailable ${skipped === 1 ? "link" : "links"} skipped` : ""}`,
      });
      onDone();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Import failed", message: error instanceof Error ? error.message : String(error) });
    } finally { setBusy(false); }
  }

  return <Form isLoading={busy} actions={<ActionPanel><Action.SubmitForm title="Download and Index" onSubmit={submit} /><Action title="Back to Downloaded Docs" onAction={onDone} /></ActionPanel>}>
    <Form.TextField id="url" title="Documentation URL" defaultValue={initialUrl} placeholder="https://tailwindcss.com/docs" info="Paste the docs root to download all linked pages below it. A single page URL limits the download to that page and its subpaths." />
    <Form.Dropdown id="engine" title="Downloader" defaultValue="built-in">
      <Form.Dropdown.Item value="built-in" title="Built-in crawler" />
      <Form.Dropdown.Item value="firecrawl" title="Local Firecrawl" />
    </Form.Dropdown>
    <Form.TextField id="firecrawlUrl" title="Local Firecrawl URL" defaultValue={LOCAL_FIRECRAWL} info="Use your Docker API port (often 3002; this machine uses 30001). Only localhost is accepted." />
    <Form.Description title="Progress" text={progress} />
  </Form>;
}

function RenameDocs({ collection, onRenamed, onDone }: { collection: Collection; onRenamed: () => Promise<void>; onDone: () => void }) {
  return <Form actions={<ActionPanel><Action.SubmitForm title="Save Name" onSubmit={async ({ title }: { title: string }) => {
    try { await renameCollection(collection, title, undefined, environment.supportPath); await onRenamed(); onDone(); }
    catch (error) { await showToast({ style: Toast.Style.Failure, title: "Could not rename documentation", message: error instanceof Error ? error.message : String(error) }); }
  }} /></ActionPanel>}>
    <Form.TextField id="title" title="Name" defaultValue={collection.title} />
  </Form>;
}

function EmbeddingSettings({ onDone }: { onDone: () => void }) {
  const [config, setConfig] = useState<EmbeddingConfig>(defaultEmbeddingConfig);
  const [serverDraft, setServerDraft] = useState<EmbeddingConfig>({ provider: "openai", endpoint: "", model: "" });
  const [localDraft, setLocalDraft] = useState(LOCAL_MODEL_ID);
  const [activeConfig, setActiveConfig] = useState<EmbeddingConfig>(defaultEmbeddingConfig);
  const [location, setLocation] = useState<"mac" | "server">("mac");
  const [loaded, setLoaded] = useState(false);
  const [indexProgress, setIndexProgress] = useState("");
  const [downloaded, setDownloaded] = useState<DownloadedModel[]>([]);
  const [serverModels, setServerModels] = useState<AvailableModel[]>([]);
  const [modelListStatus, setModelListStatus] = useState("");
  useEffect(() => {
    readEmbeddingConfig().then((value) => {
      setConfig(value); setActiveConfig(value); setLocation(value.provider === "mlx" ? "mac" : "server");
      if (value.provider !== "mlx") setServerDraft(value);
      else setLocalDraft(value.model || LOCAL_MODEL_ID);
      setLoaded(true);
    })
      .catch(async (error) => { setLoaded(true); await showToast({ style: Toast.Style.Failure, title: "Could not read embedding settings", message: String(error) }); });
    void discoverDownloadedModels().then(setDownloaded);
  }, []);
  useEffect(() => {
    if (!loaded || location !== "server") return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const endpoint = config.endpoint.trim();
        if (!endpoint) { if (active) { setServerModels([]); setModelListStatus("Enter a server URL to list its models."); } return; }
        const models = await discoverServerModels(config);
        if (active) { setServerModels(models); setModelListStatus(models.length ? "" : "No models reported by this server. Enter a model ID below."); }
      } catch { if (active) { setServerModels([]); setModelListStatus("Could not list models from this server. You can still enter a model ID."); } }
    }, 350);
    return () => { active = false; clearTimeout(timer); };
  }, [loaded, location, config.provider, config.endpoint, config.apiKeyFile]);
  useEffect(() => {
    if (!loaded) return;
    let active = true;
    const update = async () => {
      try {
        const collections = await listCollections();
        const statuses = collections.map((collection) => ({ title: collection.title, status: semanticIndexStatus(collection, activeConfig) }));
        const pending = statuses.filter(({ status }) => status.includes("%") || status.includes("queued") || status.includes("stopped") || status.includes("paused") || status.includes("rebuild") || status.includes("unavailable"))
          .map(({ title, status }) => `${title}: ${status.replace(/^Vectors /, "")}`);
        if (active) setIndexProgress(pending.length ? `${pending.slice(0, 2).join(" · ")}${pending.length > 2 ? ` · ${pending.length - 2} more` : ""}` : "");
      } catch { if (active) setIndexProgress("Could not read vector progress."); }
    };
    void update();
    const timer = setInterval(() => { void update(); }, 2000);
    return () => { active = false; clearInterval(timer); };
  }, [loaded, activeConfig]);
  async function submit(values: { apiKey?: string }) {
    try {
      const previous = await readEmbeddingConfig();
      await saveEmbeddingConfig({ provider: config.provider, endpoint: config.endpoint, model: config.model,
        apiKeyFile: previous.provider === config.provider && previous.endpoint === config.endpoint ? previous.apiKeyFile : undefined }, values.apiKey || "");
      resetSemanticWorker();
      const selected = await readEmbeddingConfig();
      setActiveConfig(selected);
      await showToast({ style: Toast.Style.Success, title: "Embedding settings saved",
        message: selected.provider === "mlx" ? "Run Build Semantic Indexes if saved pages still need vectors" : "Run Build Semantic Indexes to send saved passages to this endpoint" });
      onDone();
    } catch (error) { await showToast({ style: Toast.Style.Failure, title: "Could not save embedding settings", message: error instanceof Error ? error.message : String(error) }); }
  }
  return <Form isLoading={!loaded} actions={<ActionPanel><Action.SubmitForm title="Save Embedding Settings" onSubmit={submit} /></ActionPanel>}>
    <Form.Dropdown id="location" title="Model Location" value={location} onChange={(value) => {
      const selected = value as "mac" | "server";
      if (selected === location) return;
      if (selected === "mac") {
        setServerDraft(config);
        setConfig({ provider: "mlx", endpoint: "", model: localDraft });
      } else { setLocalDraft(config.model || LOCAL_MODEL_ID); setConfig(serverDraft); }
      setLocation(selected);
    }}>
      <Form.Dropdown.Item value="mac" title="This Mac" />
      <Form.Dropdown.Item value="server" title="Another device or cloud" />
    </Form.Dropdown>
    {location === "mac" && <>
      <Form.Dropdown id="localModel" title="Embedding Model" value={config.model || LOCAL_MODEL_ID}
        onChange={(model) => { setLocalDraft(model); setConfig({ ...config, model }); }}>
        {downloaded.filter((model) => model.directEmbedding).map((model) =>
          <Form.Dropdown.Item key={model.id} value={model.id} title={model.name} />)}
        {!downloaded.some((model) => model.id === LOCAL_MODEL_ID && model.directEmbedding) &&
          <Form.Dropdown.Item value={LOCAL_MODEL_ID} title="Perplexity pplx-embed-v1-0.6b" />}
      </Form.Dropdown>
      {downloaded.some((model) => !model.directEmbedding) && <Form.Description title="Other Downloads"
        text={`${downloaded.filter((model) => !model.directEmbedding).map((model) => model.name).join(", ")} are not compatible with this embedding worker. They can be used for AI answers later, or through a compatible embedding server if supported.`} />}
    </>}
    {location === "server" && <>
      <Form.Dropdown id="provider" title="Server API" value={config.provider} onChange={(provider) => setConfig({ ...config, provider: provider as "openai" | "ollama", apiKeyFile: undefined })}>
        <Form.Dropdown.Item value="openai" title="OpenAI-compatible" />
        <Form.Dropdown.Item value="ollama" title="Ollama" />
      </Form.Dropdown>
      <Form.TextField id="endpoint" title="Endpoint URL" value={config.endpoint} onChange={(endpoint) => setConfig({ ...config, endpoint, apiKeyFile: undefined })}
        placeholder={config.provider === "ollama" ? "http://mac-studio.local:11434" : "http://mac-studio.local:1234/v1"}
        info="Use any reachable device or server. Saved passages and search queries are sent to this address when you build or search its vectors." />
      {serverModels.length > 0 && <Form.Dropdown id="availableModel" title="Available Models" value={serverModels.some((model) => model.id === config.model) ? config.model : "custom"}
        onChange={(model) => setConfig({ ...config, model: model === "custom" ? "" : model })}>
        <Form.Dropdown.Item value="custom" title="Enter model ID below" />
        {serverModels.map((model) => <Form.Dropdown.Item key={model.id} value={model.id} title={model.name} />)}
      </Form.Dropdown>}
      {modelListStatus && <Form.Description title="Model List" text={modelListStatus} />}
      <Form.TextField id="model" title="Embedding Model ID" value={config.model} onChange={(model) => setConfig({ ...config, model })}
        placeholder="Exact model ID on your server" />
      <Form.PasswordField id="apiKey" title="API Key (Optional)" info="Leave empty to keep the existing key. Keys are stored in ~/.auth with restricted permissions." />
    </>}
    {indexProgress && <Form.Description title="Current Model Indexing" text={indexProgress} />}
  </Form>;
}

export default function Documentation() {
  const [screen, setScreen] = useState<{ kind: "import"; url: string } | { kind: "rename"; collection: Collection } | { kind: "embedding" } | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [vectorStatuses, setVectorStatuses] = useState<Record<string, string>>({});
  const [indexPaused, setIndexPaused] = useState(false);
  const [indexRunning, setIndexRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  async function refresh() {
    try { setCollections(await listCollections()); }
    catch (error) { await showToast({ style: Toast.Style.Failure, title: "Could not read downloaded docs", message: error instanceof Error ? error.message : String(error) }); }
    finally { setLoading(false); }
  }
  async function deleteCollection(collection: Collection) {
    const confirmed = await confirmAlert({
      title: `Delete ${collection.title}?`,
      message: `Move this collection and its saved pages to Trash. ${collection.pageCount} pages will be removed from offline search.`,
      primaryAction: { title: "Move to Trash", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      const paths = collectionPaths(collection, undefined, environment.supportPath);
      const existing = (await Promise.all(paths.map(async (path) => {
        try { await access(path); return path; } catch { return null; }
      }))).filter((path): path is string => path !== null);
      await trash(existing);
      await refresh();
      await showToast({ style: Toast.Style.Success, title: "Documentation moved to Trash" });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could not delete documentation", message: error instanceof Error ? error.message : String(error) });
    }
  }
  async function buildSemanticIndexes() {
    try {
      const config = await readEmbeddingConfig();
      const current = await listCollections();
      const statuses = current.map((collection) => semanticIndexStatus(collection, config));
      if (statuses.length > 0 && statuses.every((status) => status === "Vectors ready")) {
        await showToast({ style: Toast.Style.Success, title: "All saved docs are already indexed" });
        return;
      }
      if (!canAutoIndex(config)) {
        const approved = await confirmAlert({ title: "Send saved docs to embedding endpoint?",
          message: "This sends all saved passages to the selected remote endpoint. Your provider may charge for indexing. Search queries will also use this endpoint.",
          primaryAction: { title: "Build Indexes" } });
        if (!approved) return;
      }
      const started = startSemanticBackfill(environment.assetsPath);
      await showToast({ style: started ? Toast.Style.Success : Toast.Style.Failure,
        title: started ? "Vector indexing running" : "Set up local semantic search first",
        message: started ? "Progress appears in Download Docs" : "Run scripts/setup-semantic.sh for the Python and FAISS runtime." });
    } catch (error) { await showToast({ style: Toast.Style.Failure, title: "Could not build semantic indexes", message: String(error) }); }
  }
  async function toggleIndexing() {
    try {
      if (isSemanticIndexPaused()) {
        const started = await resumeSemanticBackfill(environment.assetsPath);
        if (!started) throw new Error("Set up the local embedding runtime before resuming.");
        setIndexPaused(false);
        await showToast({ style: Toast.Style.Success, title: "Vector indexing resumed" });
      } else {
        pauseSemanticBackfill();
        setIndexPaused(true);
        await showToast({ style: Toast.Style.Success, title: "Vector indexing pausing", message: "It will stop after the current passage batch is saved." });
      }
    } catch (error) { await showToast({ style: Toast.Style.Failure, title: "Could not change indexing state", message: error instanceof Error ? error.message : String(error) }); }
  }
  useEffect(() => { void refresh(); }, []);
  useEffect(() => {
    if (screen || collections.length === 0) return;
    let active = true;
    const update = async () => {
      try {
        const config = await readEmbeddingConfig();
        if (active) {
          setVectorStatuses(Object.fromEntries(collections.map((collection) =>
            [collection.id, semanticIndexStatus(collection, config)])));
          setIndexPaused(isSemanticIndexPaused());
          setIndexRunning(isSemanticIndexRunning());
        }
      } catch { if (active) setVectorStatuses({}); }
    };
    void update();
    const timer = setInterval(() => { void update(); }, 2000);
    return () => { active = false; clearInterval(timer); };
  }, [screen, collections]);
  const outstanding = collections.map((collection) => ({ collection, status: vectorStatuses[collection.id] ?? "" }))
    .filter(({ status }) => status.includes("%") || status.includes("queued") || status.includes("stopped") || status.includes("paused") || status.includes("rebuild") || status.includes("unavailable"));
  if (screen?.kind === "import") return <ImportDocs initialUrl={screen.url} onImported={refresh} onDone={() => setScreen(null)} />;
  if (screen?.kind === "rename") return <RenameDocs collection={screen.collection} onRenamed={refresh} onDone={() => setScreen(null)} />;
  if (screen?.kind === "embedding") return <EmbeddingSettings onDone={() => setScreen(null)} />;
  return <List isLoading={loading} searchBarPlaceholder="Filter downloaded documentation">
    <List.Item title="Add Documentation from URL" subtitle="Paste a docs root" icon={Icon.Plus} actions={<ActionPanel>
      <Action title="Add Documentation from URL" icon={Icon.Plus} onAction={() => setScreen({ kind: "import", url: "" })} />
    </ActionPanel>} />
    <List.Item title="Embedding Settings" subtitle="Local MLX or your own embedding endpoint and model" icon={Icon.Gear} actions={<ActionPanel>
      <Action title="Configure Embeddings" onAction={() => setScreen({ kind: "embedding" })} />
    </ActionPanel>} />
    <List.Item title={indexPaused ? "Resume Vector Indexing" : indexRunning ? "Pause Vector Indexing" : "Build Vector Indexes"}
      subtitle={indexPaused ? "Continue from saved passages" : indexRunning ? "Stop after the current saved passage batch" : "Embed saved docs with the selected model"}
      icon={indexPaused ? Icon.Play : indexRunning ? Icon.Pause : Icon.ArrowClockwise} actions={<ActionPanel>
      <Action title={indexPaused ? "Resume Vector Indexing" : indexRunning ? "Pause Vector Indexing" : "Build Vector Indexes"}
        onAction={() => { void (indexPaused || indexRunning ? toggleIndexing() : buildSemanticIndexes()); }} />
    </ActionPanel>} />
    {outstanding.length > 0 && <List.Section title="Indexing Progress">
      {outstanding.map(({ collection, status }) => <List.Item key={`progress-${collection.id}`} title={collection.title}
        subtitle={status.includes("paused") ? "Paused" : status.includes("%") ? "Embedding saved pages" : status.includes("queued") ? "Waiting for model" : "Indexing needs attention"}
        accessories={[{ text: status.replace(/^Vectors /, "") }]} icon={Icon.ArrowClockwise} actions={<ActionPanel>
          <Action title="Embedding Settings" onAction={() => setScreen({ kind: "embedding" })} />
          <Action title={indexPaused ? "Resume Vector Indexing" : indexRunning ? "Pause Vector Indexing" : "Build Vector Indexes"}
            onAction={() => { void (indexPaused || indexRunning ? toggleIndexing() : buildSemanticIndexes()); }} />
        </ActionPanel>} />)}
    </List.Section>}
    {collections.length > 0 && <List.Section title="Downloaded Documentation">
      {collections.map((collection) => <List.Item key={collection.id} title={collection.title} subtitle={collection.rootUrl} accessories={[{ text: `${collection.pageCount} pages${collection.skipped?.length ? ` · ${collection.skipped.length} skipped` : ""}` }]} actions={<ActionPanel>
        <Action title="Refresh Documentation" icon={Icon.ArrowClockwise} onAction={() => setScreen({ kind: "import", url: collection.rootUrl })} />
        <Action title="Rename Documentation" icon={Icon.Pencil} onAction={() => setScreen({ kind: "rename", collection })} />
        {collection.skipped?.length ? <Action.CopyToClipboard title="Copy Skipped URLs" content={collection.skipped.join("\n")} /> : null}
        <Action title="Delete Documentation" icon={Icon.Trash} onAction={() => { void deleteCollection(collection); }} />
        <Action.OpenInBrowser title="Open Original Site" url={collection.rootUrl} />
      </ActionPanel>} />)}
    </List.Section>}
  </List>;
}
