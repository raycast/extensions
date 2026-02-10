import {
  Detail,
  ActionPanel,
  Action,
  Clipboard,
  showToast,
  Toast,
  LocalStorage,
  Form,
  useNavigation,
  Icon,
} from "@raycast/api";
import { useEffect, useState } from "react";
import pako from "pako";

interface State {
  markdown?: string;
  isLoading: boolean;
  error?: Error;
  mermaidCode?: string;
  lastUpdated?: Date;
}

interface HistoryItem {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  lastAccessed: string;
  isPinned: boolean;
}

export default function Command() {
  const [state, setState] = useState<State>({ isLoading: true });
  const [lastClipboard, setLastClipboard] = useState<string | undefined>(undefined);
  const [isFirstRender, setIsFirstRender] = useState(true);
  const [currentHistoryItem, setCurrentHistoryItem] = useState<HistoryItem | null>(null);

  // Cargar el último diagrama guardado al iniciar
  useEffect(() => {
    async function loadSavedDiagram() {
      try {
        // Migrar datos existentes si es necesario
        await migrateHistoryData();

        const savedCode = await LocalStorage.getItem<string>("lastMermaidCode");
        const savedTimestamp = await LocalStorage.getItem<string>("lastUpdatedTimestamp");

        if (savedCode) {
          const encoded = encodeMermaid(savedCode);
          const imageUrl = `https://mermaid.ink/img/pako:${encoded}`;
          const markdown = `# Mermaid Diagram\n\n![Diagram](${imageUrl}?raycast-width=900)`;

          // Verificar si está en el historial
          const historyItem = await findHistoryItemByCode(savedCode);
          setCurrentHistoryItem(historyItem);

          setState({
            markdown,
            isLoading: false,
            mermaidCode: savedCode,
            lastUpdated: savedTimestamp ? new Date(savedTimestamp) : undefined,
          });
          setIsFirstRender(false);
        } else {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      } catch {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    }

    loadSavedDiagram();
  }, []);

  useEffect(() => {
    let isMounted = true; // Flag para evitar setState en componente desmontado

    async function loadAndRender() {
      try {
        // 1. Leer del clipboard
        const clipboardText = await Clipboard.readText();

        // Si el clipboard no ha cambiado, no hacer nada
        if (clipboardText === lastClipboard) {
          return;
        }

        if (!isMounted) return; // No actualizar si ya se desmontó

        // Actualizar el último clipboard conocido
        setLastClipboard(clipboardText);

        if (!clipboardText) {
          // Clipboard vacío - mostrar estado informativo
          if (!isMounted) return;
          setState({
            isLoading: false,
            markdown: undefined,
            error: new Error("EMPTY_CLIPBOARD"),
          });
          return;
        }

        // 2. Validar que sea código Mermaid (básico)
        if (!isMermaidCode(clipboardText)) {
          // No es Mermaid - mantener el último diagrama válido o mostrar estado informativo
          if (!isMounted) return;
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: prev.mermaidCode ? undefined : new Error("INVALID_MERMAID"),
          }));
          return;
        }

        // Mostrar loading mientras renderiza
        if (!isMounted) return;
        setState({
          isLoading: true,
          markdown: undefined,
          error: undefined,
          mermaidCode: undefined,
        });

        // 3. Encodear usando pako format
        const encoded = encodeMermaid(clipboardText);

        // 4. Generar URL
        const imageUrl = `https://mermaid.ink/img/pako:${encoded}`;

        // 5. Crear markdown para Detail (sin timestamp, solo en metadata)
        // Usar raycast-width para hacer la imagen más grande en el panel
        const markdown = `# Mermaid Diagram\n\n![Diagram](${imageUrl}?raycast-width=900)`;

        const now = new Date();
        if (!isMounted) return;
        setState({
          markdown,
          isLoading: false,
          mermaidCode: clipboardText,
          lastUpdated: now,
        });

        // Guardar en LocalStorage para persistencia
        await LocalStorage.setItem("lastMermaidCode", clipboardText);
        await LocalStorage.setItem("lastUpdatedTimestamp", now.toISOString());

        // Guardar en historial (evitando duplicados) y obtener el item
        const historyItem = await saveToHistory(clipboardText);
        if (!isMounted) return;
        setCurrentHistoryItem(historyItem);

        // Marcar que ya no es el primer render
        if (isFirstRender) {
          setIsFirstRender(false);
        }
      } catch (error) {
        if (!isMounted) return;
        setState({
          isLoading: false,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }

    // Cargar inmediatamente
    loadAndRender();

    // Polling cada 1 segundo para detectar cambios en el clipboard
    const interval = setInterval(loadAndRender, 1000);

    // Cleanup al desmontar
    return () => {
      isMounted = false; // Marcar como desmontado
      clearInterval(interval);
    };
  }, [lastClipboard, isFirstRender]); // Agregar dependencias correctas

  // Toast eliminado - el feedback visual estará en la pantalla

  // Mostrar error toast solo para errores reales (no para clipboard vacío o inválido)
  useEffect(() => {
    if (state.error && state.error.message !== "EMPTY_CLIPBOARD" && state.error.message !== "INVALID_MERMAID") {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to render diagram",
        message: state.error.message,
      });
    }
  }, [state.error]);

  // Estado: Clipboard vacío
  if (state.error?.message === "EMPTY_CLIPBOARD") {
    const emptyMarkdown = `# 📋 Watching Clipboard...

![Empty Clipboard](https://em-content.zobj.net/source/apple/391/clipboard_1f4cb.png)

## Ready to render!

I'm automatically monitoring your clipboard. Just copy some Mermaid code and I'll render it instantly! ⚡

No need to close and reopen — the diagram will appear automatically.

### Example to try:
\`\`\`
graph TD
    A[Start] --> B[Process]
    B --> C[End]
\`\`\`

💡 **Tip:** Copy the example above and watch the magic happen!

Need help? Check out [Mermaid Documentation](https://mermaid.js.org/)`;

    return <Detail markdown={emptyMarkdown} navigationTitle="Mermaid Diagram - Watching" />;
  }

  // Estado: Contenido no es Mermaid
  if (state.error?.message === "INVALID_MERMAID") {
    const invalidMarkdown = `# 🤔 Hmm, that doesn't look like Mermaid...

![Confused](https://em-content.zobj.net/source/apple/391/thinking-face_1f914.png)

## I couldn't recognize Mermaid code in your clipboard

Your clipboard contains text, but it doesn't match any known Mermaid diagram types.

🔄 **Still watching!** Copy valid Mermaid code and I'll render it automatically.

### Supported Diagram Types:
- 📊 \`graph\` / \`flowchart\` - Flowcharts
- 🔄 \`sequenceDiagram\` - Sequence diagrams
- 📦 \`classDiagram\` - Class diagrams
- 🎯 \`stateDiagram\` - State diagrams
- 🗂️ \`erDiagram\` - Entity relationship diagrams
- 📅 \`gantt\` - Gantt charts
- 🥧 \`pie\` - Pie charts
- 🗺️ \`journey\` - User journeys
- 🌳 \`gitGraph\` - Git graphs
- 🧠 \`mindmap\` - Mind maps
- ⏱️ \`timeline\` - Timelines
- 📈 \`quadrantChart\` - Quadrant charts

### Quick Example:
\`\`\`
graph TD
    A[Copy me!] --> B[Run the command]
    B --> C[See the magic! ✨]
\`\`\`

Try copying some Mermaid code and run this command again!

[Learn More](https://mermaid.js.org/) • [Try in Live Editor](https://mermaid.live/)`;

    return (
      <Detail
        markdown={invalidMarkdown}
        navigationTitle="Mermaid Diagram"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Mermaid Live Editor" url="https://mermaid.live/" />
            <Action.OpenInBrowser title="View Documentation" url="https://mermaid.js.org/" />
          </ActionPanel>
        }
      />
    );
  }

  // Error real (problemas de red, encoding, etc.)
  if (state.error) {
    return (
      <Detail
        markdown={`# ⚠️ Error\n\n${state.error.message}\n\nPlease try again or check your internet connection.`}
        navigationTitle="Mermaid Diagram"
      />
    );
  }

  // Loading state - mientras renderiza o en el primer load
  if (state.isLoading) {
    return (
      <Detail
        markdown="# ⏳ Rendering your diagram...\n\nThis will only take a moment!"
        isLoading={true}
        navigationTitle="Mermaid Diagram - Rendering"
      />
    );
  }

  return (
    <Detail
      markdown={state.markdown || "Loading..."}
      isLoading={state.isLoading}
      navigationTitle="Mermaid Diagram"
      actions={
        !state.isLoading && state.mermaidCode ? (
          <ActionPanel>
            {currentHistoryItem && (
              <Action.Push
                title="Rename Diagram"
                icon={Icon.Pencil}
                target={
                  <RenameCurrentForm
                    currentName={currentHistoryItem.name}
                    code={state.mermaidCode}
                    onRename={async (newName) => {
                      const updatedItem = { ...currentHistoryItem, name: newName };
                      setCurrentHistoryItem(updatedItem);
                    }}
                  />
                }
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            )}
            {!currentHistoryItem && (
              <Action
                title="Save to History"
                icon={Icon.SaveDocument}
                onAction={async () => {
                  const item = await saveToHistory(state.mermaidCode!);
                  setCurrentHistoryItem(item);
                  showToast({
                    style: Toast.Style.Success,
                    title: "Saved to history",
                  });
                }}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
              />
            )}
            <Action.Open
              title="Open History"
              icon={Icon.Clock}
              target="raycast://extensions/reynaldo_endis/mermaid-live/history"
              shortcut={{ modifiers: ["cmd"], key: "h" }}
            />
            <Action.OpenInBrowser
              title="Expand Diagram"
              icon="↕️"
              url={`https://mermaid.ink/img/pako:${encodeMermaid(state.mermaidCode)}`}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
            />
            <Action.OpenInBrowser
              title="Edit in Mermaid Live"
              url={`https://mermaid.live/edit#pako:${encodeMermaid(state.mermaidCode)}`}
            />
            <Action.CopyToClipboard
              title="Copy Mermaid Code"
              content={state.mermaidCode}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Image URL"
              content={`https://mermaid.ink/img/pako:${encodeMermaid(state.mermaidCode)}`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel>
        ) : undefined
      }
      metadata={
        !state.isLoading && state.mermaidCode ? (
          <Detail.Metadata>
            {currentHistoryItem ? (
              <>
                <Detail.Metadata.Label title="Name" icon={Icon.SaveDocument} text={currentHistoryItem.name} />
                <Detail.Metadata.Label title="Status" icon={Icon.CheckCircle} text="Saved in History" />
              </>
            ) : (
              <Detail.Metadata.Label title="Status" icon={Icon.XMarkCircle} text="Not Saved" />
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Format" text="Mermaid" />
            <Detail.Metadata.Label title="Lines" text={state.mermaidCode.split("\n").length.toString()} />
            <Detail.Metadata.Label title="Characters" text={state.mermaidCode.length.toString()} />
            {state.lastUpdated && (
              <>
                <Detail.Metadata.Separator />
                <Detail.Metadata.Label
                  title="Rendered"
                  text={state.lastUpdated.toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                />
              </>
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link title="Documentation" target="https://mermaid.js.org/" text="Mermaid Docs" />
            <Detail.Metadata.Link
              title="Live Editor"
              target={`https://mermaid.live/edit#pako:${encodeMermaid(state.mermaidCode)}`}
              text="Edit Online"
            />
          </Detail.Metadata>
        ) : undefined
      }
    />
  );
}

// Utility Functions

function isMermaidCode(text: string): boolean {
  const trimmed = text.trim();
  const mermaidKeywords = [
    "graph",
    "flowchart",
    "sequenceDiagram",
    "classDiagram",
    "stateDiagram",
    "erDiagram",
    "gantt",
    "pie",
    "journey",
    "gitGraph",
    "mindmap",
    "timeline",
    "quadrantChart",
  ];

  return mermaidKeywords.some(
    (keyword) => trimmed.startsWith(keyword) || trimmed.includes(`\n${keyword}`) || trimmed.includes(` ${keyword}`),
  );
}

function encodeMermaid(mermaidCode: string): string {
  // Crear el objeto con formato mermaid.ink
  const graphObject = {
    code: mermaidCode,
    mermaid: JSON.stringify({ theme: "default" }),
  };

  // Convertir a JSON y comprimir con pako (deflate)
  const jsonString = JSON.stringify(graphObject);
  const compressed = pako.deflate(jsonString);

  // Convertir a base64 URL-safe
  const base64 = Buffer.from(compressed).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// Funciones de gestión de historial
async function saveToHistory(code: string): Promise<HistoryItem> {
  const historyJson = await LocalStorage.getItem<string>("mermaid-history");
  const history: HistoryItem[] = historyJson ? JSON.parse(historyJson) : [];

  const now = new Date().toISOString();

  // Verificar si ya existe (evitar duplicados por código)
  const existingIndex = history.findIndex((item) => item.code === code);
  let currentItem: HistoryItem;

  if (existingIndex !== -1) {
    // Actualizar último acceso del existente
    history[existingIndex].lastAccessed = now;
    currentItem = history[existingIndex];
  } else {
    // Crear nuevo item con nombre auto-generado
    const diagramType = detectDiagramType(code);
    currentItem = {
      id: generateId(),
      code,
      name: `${diagramType} - ${new Date().toLocaleDateString()}`,
      createdAt: now,
      lastAccessed: now,
      isPinned: false,
    };
    history.unshift(currentItem); // Agregar al inicio
  }

  // Limitar historial a 100 items
  const limitedHistory = history.slice(0, 100);
  await LocalStorage.setItem("mermaid-history", JSON.stringify(limitedHistory));

  return currentItem;
}

async function findHistoryItemByCode(code: string): Promise<HistoryItem | null> {
  const historyJson = await LocalStorage.getItem<string>("mermaid-history");
  if (!historyJson) return null;
  const history: HistoryItem[] = JSON.parse(historyJson);
  return history.find((item) => item.code === code) || null;
}

async function renameCurrentDiagram(code: string, newName: string): Promise<void> {
  const historyJson = await LocalStorage.getItem<string>("mermaid-history");
  if (!historyJson) return;
  const history: HistoryItem[] = JSON.parse(historyJson);
  const item = history.find((item) => item.code === code);
  if (item) {
    item.name = newName;
    await LocalStorage.setItem("mermaid-history", JSON.stringify(history));
  }
}

function detectDiagramType(code: string): string {
  const trimmed = code.trim();
  if (trimmed.startsWith("graph") || trimmed.startsWith("flowchart")) return "Flowchart";
  if (trimmed.includes("sequenceDiagram")) return "Sequence";
  if (trimmed.includes("classDiagram")) return "Class";
  if (trimmed.includes("stateDiagram")) return "State";
  if (trimmed.includes("erDiagram")) return "ER";
  if (trimmed.includes("gantt")) return "Gantt";
  if (trimmed.includes("pie")) return "Pie";
  if (trimmed.includes("journey")) return "Journey";
  if (trimmed.includes("gitGraph")) return "Git";
  if (trimmed.includes("mindmap")) return "Mindmap";
  if (trimmed.includes("timeline")) return "Timeline";
  if (trimmed.includes("quadrantChart")) return "Quadrant";
  return "Diagram";
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Migrar datos existentes para agregar lastAccessed
async function migrateHistoryData(): Promise<void> {
  const historyJson = await LocalStorage.getItem<string>("mermaid-history");
  if (!historyJson) return;

  const history: HistoryItem[] = JSON.parse(historyJson);
  let needsMigration = false;

  const migratedHistory = history.map((item) => {
    if (!item.lastAccessed) {
      needsMigration = true;
      return {
        ...item,
        lastAccessed: item.createdAt || new Date().toISOString(),
      };
    }
    return item;
  });

  if (needsMigration) {
    await LocalStorage.setItem("mermaid-history", JSON.stringify(migratedHistory));
  }
}

// Formulario para renombrar desde el render
function RenameCurrentForm({
  currentName,
  code,
  onRename,
}: {
  currentName: string;
  code: string;
  onRename: (newName: string) => void;
}) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { name: string }) {
    if (values.name.trim()) {
      await renameCurrentDiagram(code, values.name.trim());
      showToast({
        style: Toast.Style.Success,
        title: "Renamed successfully",
      });
      onRename(values.name.trim());
      pop();
    }
  }

  return (
    <Form
      navigationTitle="Rename Diagram"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Enter new name" defaultValue={currentName} />
    </Form>
  );
}
