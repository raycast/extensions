import {
  ActionPanel,
  Action,
  Form,
  showToast,
  Toast,
  getPreferenceValues,
  Detail,
  useNavigation,
  getSelectedText,
  LocalStorage,
  showInFinder,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { exec } from "child_process";
import { writeFile, unlink } from "fs/promises";
import { tmpdir, homedir } from "os";
import { join } from "path";

interface Preferences {
  pathToMaliOC: string;
  showSavedReportInFinder?: boolean;
  reportsSaveDirectory?: string;
}

const PREFERENCES = getPreferenceValues<Preferences>();
const MALIOC_PATH = PREFERENCES.pathToMaliOC;
const SHOW_SAVED_IN_FINDER = PREFERENCES.showSavedReportInFinder ?? true;
const DEFAULT_SAVE_DIR = join(homedir(), "Downloads");

function getReportsSaveDirectory(): string {
  const raw = (PREFERENCES.reportsSaveDirectory || "").trim();
  if (!raw) return DEFAULT_SAVE_DIR;
  // Expand ~ to homedir
  return raw.replace(/^~(?=\/|$)/, homedir());
}

// --- Interfaces for MaliOC JSON structure ---
interface MaliProducer {
  name: string;
  version: [number, number, number];
  build: string;
  documentation: string;
}

interface MaliPipeline {
  name: string;
  display_name: string;
  description: string;
}

interface MaliHardware {
  architecture: string;
  core: string;
  revision: string;
  pipelines?: MaliPipeline[];
}

interface MaliShaderType {
  api: string;
  type: string;
}

interface MaliShaderProperty {
  name: string;
  display_name: string;
  description: string;
  value: number | string | boolean;
}

interface MaliVertexAttribute {
  location: number | null;
  symbol: string;
}

interface MaliShaderCost {
  cycle_count: (number | null)[];
  bound_pipelines: (string | null)[];
}

interface MaliVariantPerformance {
  total_cycles: MaliShaderCost;
  shortest_path_cycles: MaliShaderCost;
  longest_path_cycles: MaliShaderCost;
  pipelines: string[];
}

interface MaliShaderVariant {
  name: string;
  performance: MaliVariantPerformance;
  properties: MaliShaderProperty[];
}

interface MaliShaderInfo {
  filename: string;
  hardware: MaliHardware;
  driver: string;
  shader: MaliShaderType;
  notes: string[];
  warnings: string[];
  properties: MaliShaderProperty[];
  variants: MaliShaderVariant[];
  attribute_streams?: {
    position?: MaliVertexAttribute[];
    nonposition?: MaliVertexAttribute[];
  };
  errors?: string[]; // Only present in error reports
}

interface MaliSchema {
  name: "performance" | "error" | "info" | "list";
  version: number;
}

// Base interface for all Mali reports
interface MaliReportBase {
  schema: MaliSchema;
  producer: MaliProducer;
}

// Performance report (successful compilation)
interface MaliPerformanceReport extends MaliReportBase {
  schema: { name: "performance"; version: number };
  shaders: MaliShaderInfo[];
}

// Error report (compilation failed)
interface MaliErrorReport extends MaliReportBase {
  schema: { name: "error"; version: number };
  shaders: (MaliShaderInfo & { errors: string[] })[];
}

// Union type for all possible reports
type MaliJsonOutput = MaliPerformanceReport | MaliErrorReport;

export interface GpuCore {
  id: string;
  name: string;
}

export type OutputMode = "text" | "json";

// --- GPU Cores Cache (LocalStorage) ---
const GPU_CORES_CACHE_KEY = "gpu_cores_cache";
const GPU_CORES_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

type GpuCoresCache = { cores: GpuCore[]; timestamp: number };

// --- Default GPU Core (LocalStorage) ---
const DEFAULT_GPU_CORE_KEY = "default_gpu_core";

export async function getDefaultGpuCore(): Promise<string | null> {
  try {
    const val = await LocalStorage.getItem<string>(DEFAULT_GPU_CORE_KEY);
    return val ?? null;
  } catch {
    return null;
  }
}

/**
 * Get list of available GPU cores (uses cache with 24h TTL)
 */
export async function getAvailableGpuCores(): Promise<GpuCore[]> {
  // Try cache first
  const cached = await loadGpuCoresFromCache();
  if (cached && isCacheFresh(cached.timestamp)) {
    return cached.cores;
  }

  // Fetch fresh data
  const cores = await fetchGpuCoresFromMalioc();
  await saveGpuCoresToCache(cores);
  return cores;
}

async function setDefaultGpuCoreLocal(coreId: string): Promise<void> {
  await LocalStorage.setItem(DEFAULT_GPU_CORE_KEY, coreId);
}

async function loadGpuCoresFromCache(): Promise<GpuCoresCache | null> {
  try {
    const raw = await LocalStorage.getItem<string>(GPU_CORES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GpuCoresCache;
    if (!parsed.cores || !Array.isArray(parsed.cores) || typeof parsed.timestamp !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

async function saveGpuCoresToCache(cores: GpuCore[]) {
  const payload: GpuCoresCache = { cores, timestamp: Date.now() };
  await LocalStorage.setItem(GPU_CORES_CACHE_KEY, JSON.stringify(payload));
}

function isCacheFresh(timestamp: number): boolean {
  return Date.now() - timestamp < GPU_CORES_TTL_MS;
}

async function fetchGpuCoresFromMalioc(): Promise<GpuCore[]> {
  return new Promise((resolve, reject) => {
    const command = `"${MALIOC_PATH}" --list --format json`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      try {
        // JSON schema: { cores: [{ core: string, apis: string[] }], ... }
        const parsed = JSON.parse(stdout) as { cores?: { core: string; apis?: string[] }[] };
        const coresList = (parsed.cores ?? []).map((c) => c.core).filter(Boolean);
        const cores: GpuCore[] = coresList.map((coreName) => ({ id: coreName, name: coreName }));
        resolve(cores);
      } catch (e) {
        reject(new Error(`Failed to parse MaliOC cores JSON: ${(e as Error).message}`));
      }
    });
  });
}

// Choose preferred core: default if present (exact match), else first.
function chooseCore(cores: GpuCore[], defaultCore?: string | null): string {
  if (!cores.length) return "";
  if (defaultCore && cores.some((c) => c.id === defaultCore)) {
    return defaultCore;
  }
  return cores[0].id;
}

// --- MaliOC Validation ---
async function validateMaliOC(path: string): Promise<{ isValid: boolean; error?: string }> {
  return new Promise((resolve) => {
    exec(`"${path}" --version`, (error, stdout, stderr) => {
      if (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          resolve({ isValid: false, error: "MaliOC executable not found at specified path" });
        } else {
          resolve({ isValid: false, error: `Failed to execute MaliOC: ${error.message}` });
        }
        return;
      }

      // Check if output contains "Mali Offline Compiler"
      const output = stdout + stderr;
      if (output.toLowerCase().includes("mali offline compiler")) {
        resolve({ isValid: true });
      } else {
        resolve({ isValid: false, error: "File is not Mali Offline Compiler executable" });
      }
    });
  });
}

// --- Main Component ---
export default function ProfileShader() {
  const { push } = useNavigation();
  type ShaderType = "vertex" | "fragment" | "unset";
  const [shaderType, setShaderType] = useState<ShaderType>("unset");
  const [gpuCore, setGpuCore] = useState("");
  const [outputMode, setOutputMode] = useState<OutputMode>("json"); // Default to JSON now
  const [gpuCores, setGpuCores] = useState<GpuCore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [coresError, setCoresError] = useState<string | undefined>(undefined);
  const [maliocValid, setMaliocValid] = useState<boolean | null>(null);
  const [maliocError, setMaliocError] = useState<string | undefined>(undefined);
  const validateMaliocStarted = useRef(false);

  useEffect(() => {
    if (validateMaliocStarted.current) {
      return;
    }
    validateMaliocStarted.current = true;

    async function validateAndFetchCores() {
      try {
        const defaultCore = await getDefaultGpuCore();
        // Load from cache for fast UI
        const cached = await loadGpuCoresFromCache();
        if (cached && cached.cores.length > 0) {
          setGpuCores(cached.cores);
          setGpuCore(chooseCore(cached.cores, defaultCore));
          setIsLoading(false);
        }

        // Validate MaliOC
        const validation = await validateMaliOC(MALIOC_PATH);
        setMaliocValid(validation.isValid);

        if (!validation.isValid) {
          setMaliocError(validation.error);
          setIsLoading(false);
          showToast({
            style: Toast.Style.Failure,
            title: "MaliOC Path Invalid",
            message: validation.error || "Please check your MaliOC installation path in preferences",
          });
          return;
        }

        // If cache is missing or stale, fetch fresh cores and cache them
        const cacheIsFresh = cached ? isCacheFresh(cached.timestamp) : false;
        if (!cacheIsFresh) {
          try {
            const cores = await fetchGpuCoresFromMalioc();
            setGpuCores(cores);
            if (cores.length > 0) {
              setGpuCore(chooseCore(cores, defaultCore));
            }
            await saveGpuCoresToCache(cores);
          } catch (error) {
            console.error("MaliOC cores fetch failed:", error);
            setCoresError("Could not fetch GPU cores. Please enter one manually.");
            if (defaultCore) {
              setGpuCore(defaultCore);
            }
          }
        }

        setIsLoading(false);
      } catch (e) {
        console.error("Validation error:", e);
        setMaliocError("Unexpected error during MaliOC validation");
        setIsLoading(false);
      }
    }

    validateAndFetchCores();
  }, []);

  // --- Shader Type Detection (on demand) ---
  function detectShaderTypeFromText(text: string): Exclude<ShaderType, "unset"> | null {
    try {
      const src = text.trim();
      if (!src) return null;
      const lines = src.split(/\r?\n/).map((l) => l.trim());
      // Skip initial empty/comment lines
      let i = 0;
      while (i < lines.length && (lines[i] === "" || lines[i].startsWith("//") || lines[i].startsWith("/*"))) i++;
      const first = lines[i] ?? "";
      const vtxRe = /^#\s*if(def)?\b.*\bVERTEX\b/i;
      const fragRe = /^#\s*if(def)?\b.*\bFRAGMENT\b/i;
      if (vtxRe.test(first)) return "vertex";
      if (fragRe.test(first)) return "fragment";
      // Simple heuristics as a fallback
      if (src.includes("gl_Position")) return "vertex";
      if (src.includes("SV_Target") || /\bout\s+vec[234]/.test(src)) return "fragment";
      return null;
    } catch {
      return null;
    }
  }

  async function handleDetectShaderType() {
    try {
      const text = await getSelectedText();
      const detected = detectShaderTypeFromText(text);
      if (detected) {
        setShaderType(detected);
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to detect shader type",
          message: "Choose shader type manually",
        });
      }
    } catch (error) {
      await showFailureToast(error, {
        title: "Failed to get selected text",
        message: "Select shader text and try again",
      });
    }
  }

  async function handleSubmit() {
    setIsLoading(true);
    let shaderContent = "";
    try {
      shaderContent = await getSelectedText();
      if (!shaderContent.trim()) throw new Error("No text selected.");
    } catch (error) {
      await showFailureToast(error, { title: "Error Getting Text" });
      setIsLoading(false);
      return;
    }
    if (shaderType === "unset") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Select Shader Type",
        message: "Choose shader type manually or use Detect Shader Type",
      });
      setIsLoading(false);
      return;
    }
    try {
      const result = await processShader(shaderContent, shaderType, gpuCore, outputMode);
      push(<ResultView output={result} mode={outputMode} />);
    } catch (error) {
      await showFailureToast(error, { title: "MaliOC Failed" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSetDefaultGpuCore() {
    try {
      await setDefaultGpuCoreLocal(gpuCore);
      await showToast({ style: Toast.Style.Success, title: "Default GPU Core Set", message: `${gpuCore}` });
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Failed to Set Default" });
    }
  }

  async function handleRefreshCores() {
    if (maliocValid !== true) {
      await showToast({
        style: Toast.Style.Failure,
        title: "MaliOC Not Valid",
        message: "Cannot refresh cores until MaliOC path is valid.",
      });
      return;
    }
    setIsLoading(true);
    setCoresError(undefined);
    try {
      const [cores, defaultCore] = await Promise.all([fetchGpuCoresFromMalioc(), getDefaultGpuCore()]);
      setGpuCores(cores);
      if (cores.length > 0) {
        setGpuCore(chooseCore(cores, defaultCore));
      }
      await saveGpuCoresToCache(cores);
      await showToast({
        style: Toast.Style.Success,
        title: "GPU Cores Updated",
        message: `Loaded ${cores.length} cores`,
      });
    } catch (error) {
      console.error("Manual refresh failed:", error);
      setCoresError("Could not fetch GPU cores. Please enter one manually.");
      await showToast({ style: Toast.Style.Failure, title: "Failed to Refresh Cores" });
    } finally {
      setIsLoading(false);
    }
  }

  // Block UI if MaliOC is invalid
  if (maliocValid === false) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action
              title="Fix Malioc Path"
              onAction={() =>
                showToast({
                  style: Toast.Style.Failure,
                  title: "Open Raycast Preferences",
                  message: "Go to Extensions → GLES to MaliOC → Configure MaliOC Path",
                })
              }
            />
          </ActionPanel>
        }
      >
        <Form.Description
          title="⚠️ MaliOC Path Invalid"
          text={`${maliocError}\n\nPlease check your MaliOC installation path in extension preferences.\n\nExpected: Mali Offline Compiler executable\nCurrent path: ${MALIOC_PATH}`}
        />
      </Form>
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {maliocValid ? (
            <>
              {shaderType !== "unset" && <Action.SubmitForm title="Profile Shader" onSubmit={handleSubmit} />}
              <Action title="Detect Shader Type" onAction={handleDetectShaderType} />
              <Action
                title="Set Current GPU Core as Default"
                onAction={handleSetDefaultGpuCore}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
              <Action title="Refresh GPU Cores" onAction={handleRefreshCores} />
            </>
          ) : (
            <Action title="Validating MaliOC…" onAction={() => {}} />
          )}
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="shaderType"
        title="Shader Type"
        value={shaderType}
        onChange={(val) => {
          const v = val as ShaderType;
          setShaderType(v);
        }}
      >
        {shaderType === "unset" && <Form.Dropdown.Item value="unset" title="Select Shader Type" />}
        <Form.Dropdown.Item value="vertex" title="Vertex" />
        <Form.Dropdown.Item value="fragment" title="Fragment" />
      </Form.Dropdown>
      {coresError || gpuCores.length === 0 ? (
        <Form.TextField
          id="gpuCoreInput"
          title="GPU Core"
          value={gpuCore}
          onChange={(val) => setGpuCore(val)}
          error={coresError}
        />
      ) : (
        <Form.Dropdown id="gpuCore" title="GPU Core" value={gpuCore} onChange={(val) => setGpuCore(val)} storeValue>
          {gpuCores.map((core) => (
            <Form.Dropdown.Item key={core.id} value={core.id} title={core.name} />
          ))}
        </Form.Dropdown>
      )}
      <Form.Dropdown
        id="outputMode"
        title="Output Mode"
        value={outputMode}
        onChange={(value) => setOutputMode(value as OutputMode)}
        storeValue
      >
        <Form.Dropdown.Item value="text" title="Plain Text" />
        <Form.Dropdown.Item value="json" title="Structured Report" />
      </Form.Dropdown>
    </Form>
  );
}

// --- Result View and Formatting ---
export function ResultView({ output, mode }: { output: string; mode: OutputMode }) {
  if (mode === "json") {
    try {
      const jsonData = JSON.parse(output) as MaliJsonOutput;
      const markdown = formatJsonReport(jsonData);

      const shaderInfo = jsonData.shaders?.[0];
      const core = shaderInfo?.hardware?.core ?? "unknown-core";
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const baseName = `malioc-report-${core}-${timestamp}`;

      async function saveFile(filename: string, contents: string) {
        const baseDir = getReportsSaveDirectory();
        let target = join(baseDir, filename);
        try {
          await writeFile(target, contents, { encoding: "utf8" });
        } catch {
          // fallback to tmp if Downloads not accessible
          target = join(tmpdir(), filename);
          await writeFile(target, contents, { encoding: "utf8" });
        }
        await showToast({ style: Toast.Style.Success, title: "Saved", message: target });
        if (SHOW_SAVED_IN_FINDER) {
          await showInFinder(target);
        }
      }

      return (
        <Detail
          markdown={markdown}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Markdown Report" content={markdown} />
              <Action
                title="Save Markdown Report"
                onAction={async () => {
                  await saveFile(`${baseName}.md`, markdown);
                }}
              />
              <Action.CopyToClipboard title="Copy Raw JSON" content={output} />
              <Action
                title="Save Raw JSON"
                onAction={async () => {
                  await saveFile(`${baseName}.json`, JSON.stringify(jsonData, null, 2));
                }}
              />
            </ActionPanel>
          }
        />
      );
    } catch (error) {
      const markdown = `## Failed to parse JSON\n\n**Error:**\n\`\`\`\n${error}\n\`\`\`\n\n**Raw Output:**\n\`\`\`\n${output}\n\`\`\``;
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      async function saveFile(filename: string, contents: string) {
        const baseDir = getReportsSaveDirectory();
        let target = join(baseDir, filename);
        try {
          await writeFile(target, contents, { encoding: "utf8" });
        } catch {
          target = join(tmpdir(), filename);
          await writeFile(target, contents, { encoding: "utf8" });
        }
        await showToast({ style: Toast.Style.Success, title: "Saved", message: target });
        if (SHOW_SAVED_IN_FINDER) {
          await showInFinder(target);
        }
      }
      return (
        <Detail
          markdown={markdown}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Raw Output" content={output} />
              <Action
                title="Save Raw Output"
                onAction={async () => {
                  await saveFile(`malioc-output-${timestamp}.txt`, output);
                }}
              />
            </ActionPanel>
          }
        />
      );
    }
  }
  const markdown = `\`\`\`\n${output}\n\`\`\``;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  async function saveFile(filename: string, contents: string) {
    const baseDir = getReportsSaveDirectory();
    let target = join(baseDir, filename);
    try {
      await writeFile(target, contents, { encoding: "utf8" });
    } catch {
      target = join(tmpdir(), filename);
      await writeFile(target, contents, { encoding: "utf8" });
    }
    await showToast({ style: Toast.Style.Success, title: "Saved", message: target });
    if (SHOW_SAVED_IN_FINDER) {
      await showInFinder(target);
    }
  }
  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Output" content={output} />
          <Action
            title="Save Output as Markdown"
            onAction={async () => {
              await saveFile(`malioc-output-${timestamp}.md`, markdown);
            }}
          />
        </ActionPanel>
      }
    />
  );
}

function formatJsonReport(data: MaliJsonOutput): string {
  // Check report type and handle accordingly
  if (data.schema.name === "error") {
    const errorReport = data as MaliErrorReport;
    const shader = errorReport.shaders[0];
    return formatErrorReport(errorReport, shader);
  }

  const performanceReport = data as MaliPerformanceReport;
  if (!performanceReport.shaders || performanceReport.shaders.length === 0) {
    return `# MaliOC Report\n\nNo shaders found in report.`;
  }

  // Render all shaders found in the report (usually 1)
  const parts = performanceReport.shaders.map((shader) => {
    // If no variants – still show basic info
    if (!shader.variants || shader.variants.length === 0) {
      return formatBasicInfo(performanceReport, shader);
    }
    return formatPerformanceReport(performanceReport, shader);
  });

  return parts.join("\n\n---\n\n");
}

function formatErrorReport(report: MaliErrorReport, shader: MaliShaderInfo & { errors: string[] }): string {
  return `
# MaliOC Compilation Error

## Configuration
- **Hardware:** ${shader.hardware.architecture} ${shader.hardware.core} ${shader.hardware.revision}
- **Driver:** ${shader.driver}
- **Shader:** ${shader.shader.api} ${shader.shader.type}

## Compilation Errors
${shader.errors.map((error) => `- ${error}`).join("\n")}

${
  shader.warnings.length > 0
    ? `## Warnings
${shader.warnings.map((warning) => `- ${warning}`).join("\n")}`
    : ""
}

---
*${report.producer.name} v${report.producer.version.join(".")} (Build ${report.producer.build})*
`;
}

function formatBasicInfo(report: MaliPerformanceReport, shader: MaliShaderInfo): string {
  return `
# MaliOC Report: ${shader.hardware.core}

## Configuration
- **Hardware:** ${shader.hardware.architecture} ${shader.hardware.core} ${shader.hardware.revision}
- **Driver:** ${shader.driver}
- **Shader:** ${shader.shader.api} ${shader.shader.type}

${
  shader.warnings.length > 0
    ? `## Warnings
${shader.warnings.map((warning) => `- ${warning}`).join("\n")}

`
    : ""
}${
    shader.notes.length > 0
      ? `## Notes
${shader.notes.map((note) => `- ${note}`).join("\n")}

`
      : ""
  }---
*${report.producer.name} v${report.producer.version.join(".")} (Build ${report.producer.build})*
`;
}

function formatPerformanceReport(report: MaliPerformanceReport, shader: MaliShaderInfo): string {
  const hardwarePipelines = shader.hardware.pipelines || [];

  // Helper to get pipeline display name
  const getPipelineDisplayName = (pipelineName: string) => {
    const hwPipeline = hardwarePipelines.find((p) => p.name === pipelineName);
    return hwPipeline?.display_name || pipelineName;
  };

  // Helper to format numbers with reasonable precision
  const formatNumber = (value: number | string | boolean): string => {
    if (typeof value === "number") {
      return Number(value.toFixed(3)).toString();
    }
    return String(value);
  };

  // Helper to format cost rows
  const perfRow = (title: string, pipelines: string[], cost: MaliShaderCost) => {
    const cycles = pipelines
      .map((_, i) => {
        const count = cost.cycle_count[i];
        return count !== null ? formatNumber(count) : "N/A";
      })
      .map((s) => s.padStart(8));

    const boundDisplay =
      (cost.bound_pipelines || [])
        .filter((bp): bp is string => !!bp)
        .map((bp) => getPipelineDisplayName(bp))
        .join(", ") || "N/A";

    return `| ${title.padEnd(25)} | ${cycles.join(" | ")} | ${boundDisplay} |`;
  };

  // Format all top-level shader properties
  const shaderPropsSection =
    shader.properties && shader.properties.length > 0
      ? `## Shader Properties\n${shader.properties
          .map((p) => `- **${p.display_name}**: \`${formatNumber(p.value)}\``)
          .join("\n")}\n\n`
      : "";

  // Format each variant in detail
  const variantsSections = shader.variants
    .map((variant) => {
      const pipelines = variant.performance.pipelines;
      const headerRow = pipelines.map((name) => getPipelineDisplayName(name).padStart(8)).join(" | ");
      const separatorRow = pipelines.map(() => "--------").join(" | ");

      // Variant properties as a compact bullet list (all properties available)
      const variantProps = (variant.properties || [])
        .map((p) => `- ${p.display_name}: \`${formatNumber(p.value)}\``)
        .join("\n");

      return `### Variant: ${variant.name}

#### Resource Usage
${variantProps}

#### Performance Metrics
| Metric                      | ${headerRow}    | Bound       |
| --------------------------- | ${separatorRow} | ----------- |
${perfRow("Total", pipelines, variant.performance.total_cycles)}
${perfRow("Shortest", pipelines, variant.performance.shortest_path_cycles)}
${perfRow("Longest", pipelines, variant.performance.longest_path_cycles)}
`;
    })
    .join("\n");

  return `
# MaliOC Report: ${shader.hardware.core}

## Configuration
- **Hardware:** ${shader.hardware.architecture} ${shader.hardware.core} ${shader.hardware.revision}
- **Driver:** ${shader.driver}
- **Shader:** ${shader.shader.api} ${shader.shader.type}

${shaderPropsSection}## Variants

${variantsSections}

${
  shader.warnings.length > 0
    ? `## Warnings
${shader.warnings.map((warning) => `⚠️ ${warning}`).join("\n")}

`
    : ""
}${
    shader.notes.length > 0
      ? `## Notes
${shader.notes.map((note) => `ℹ️ ${note}`).join("\n")}

`
      : ""
  }${shader.attribute_streams ? formatAttributeStreams(shader.attribute_streams) : ""}---
*${report.producer.name} v${report.producer.version.join(".")} (Build ${report.producer.build})*
`;
}

function formatAttributeStreams(streams: {
  position?: MaliVertexAttribute[];
  nonposition?: MaliVertexAttribute[];
}): string {
  let result = "## Recommended Attribute Streams\n\n";

  if (streams.position && streams.position.length > 0) {
    result += "**Position attributes:**\n";
    streams.position.forEach((attr) => {
      const location = attr.location !== null ? `location=${attr.location}` : "location=dynamic";
      result += `- \`${attr.symbol}\` (${location})\n`;
    });
    result += "\n";
  }

  if (streams.nonposition && streams.nonposition.length > 0) {
    result += "**Non-position attributes:**\n";
    streams.nonposition.forEach((attr) => {
      const location = attr.location !== null ? `location=${attr.location}` : "location=dynamic";
      result += `- \`${attr.symbol}\` (${location})\n`;
    });
    result += "\n";
  }

  return result;
}

// --- Core Shader Processing Logic ---
export async function processShader(content: string, type: string, core: string, mode: OutputMode): Promise<string> {
  let processedContent = content.trim();
  const detectedType = type;

  const lines = processedContent.split("\n");

  if (lines[0].trim().startsWith("#ifdef VERTEX") || lines[0].trim().startsWith("#ifdef FRAGMENT")) {
    lines.shift();
  }
  if (lines[lines.length - 1].trim() === "#endif") {
    lines.pop();
  }

  processedContent = lines.join("\n").trim();
  if (!processedContent.trim().startsWith("#version")) {
    throw new Error(`Invalid shader: must start with #version. Starts with: "${processedContent.split("\n")[0]}"`);
  }
  if (
    processedContent.includes("layout") &&
    processedContent.includes("binding") &&
    processedContent.includes("#version 300 es")
  ) {
    processedContent = processedContent.replace("#version 300 es", "#version 310 es");
    await showToast({ style: Toast.Style.Success, title: "Info", message: "Upgraded shader to GLES 3.10" });
  }
  const tempPath = join(tmpdir(), `shader_${Date.now()}.glsl`);
  await writeFile(tempPath, processedContent);
  const formatFlag = mode === "json" ? "--format json" : "";
  const command = `${MALIOC_PATH} ${formatFlag} --${detectedType} --core "${core}" "${tempPath}"`;

  console.log("Executing command:", command);
  console.log("Shader content:\n---\n", processedContent, "\n---");

  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      unlink(tempPath).catch(console.error);

      if (error) {
        console.error("MaliOC Error:", error);
        console.error("MaliOC Stderr:", stderr);
        console.error("MaliOC Stdout:", stdout);

        // Handle different exit codes according to MaliOC documentation
        const exitCode = error.code;

        if (exitCode === 1) {
          // Compilation error - MaliOC should return error JSON in stdout
          if (mode === "json" && stdout.trim()) {
            console.log("MaliOC returned error JSON, resolving with stdout");
            resolve(stdout);
          } else {
            // Fallback for non-JSON mode or empty stdout
            reject(new Error(stderr || stdout || "Shader compilation failed."));
          }
        } else if (exitCode === 2) {
          // Configuration error (bad command, missing files, etc.)
          reject(new Error(`Configuration error: ${stderr || stdout || "Invalid MaliOC command or missing files."}`));
        } else {
          // Other errors
          reject(new Error(`MaliOC failed (exit code ${exitCode}): ${stderr || stdout || "Unknown error"}`));
        }
      } else {
        // Success (exit code 0)
        resolve(stdout);
      }
    });
  });
}
