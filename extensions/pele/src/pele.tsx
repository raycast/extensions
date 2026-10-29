import { Clipboard, Detail, environment, getSelectedText } from "@raycast/api";
import { useEffect, useState } from "react";
import { supports } from "pele";
import { Editor } from "./components/editor";
import { Preview } from "./components/preview";
import { cleanupPreviews, writeDiagram, type DiagramFiles } from "./lib/files";
import { normalizeSource, readInput } from "./lib/input";
import { renderDiagram, type Diagram, type DiagramOptions } from "./lib/render";
import { getSettings } from "./settings";

type State =
  | { kind: "loading" }
  | { kind: "editor"; source: string; options: DiagramOptions; error?: string }
  | { kind: "preview"; diagram: Diagram; files: DiagramFiles; options: DiagramOptions };

export default function Command() {
  const [settings] = useState(getSettings);
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      let source = "";
      try {
        source = await readInput(getSelectedText, Clipboard.readText);
        if (cancelled) return;
        if (source.trim()) source = normalizeSource(source);
        if (supports(source)) {
          const diagram = await renderDiagram(source, settings.options, environment.assetsPath);
          if (cancelled) return;
          const files = await writeDiagram(diagram, settings.cachePath);
          if (!cancelled) setState({ kind: "preview", diagram, files, options: settings.options });
        } else {
          setState({ kind: "editor", source, options: settings.options });
        }
      } catch (error) {
        if (!cancelled)
          setState({
            kind: "editor",
            source,
            options: settings.options,
            error: error instanceof Error ? error.message : "Could not read or render the diagram.",
          });
      }
    }
    void initialize();
    void cleanupPreviews(settings.cachePath).catch(() => console.warn("Could not remove expired Pele previews."));
    return () => {
      cancelled = true;
    };
  }, [settings]);

  if (state.kind === "loading") return <Detail isLoading markdown="Preparing diagram…" />;
  if (state.kind === "preview") {
    return (
      <Preview
        diagram={state.diagram}
        files={state.files}
        saveFolder={settings.saveFolder}
        onEdit={() => setState({ kind: "editor", source: state.diagram.source, options: state.options })}
      />
    );
  }
  return (
    <Editor
      source={state.source}
      options={state.options}
      error={state.error}
      onRender={async (source, options) => {
        const diagram = await renderDiagram(source, options, environment.assetsPath);
        const files = await writeDiagram(diagram, settings.cachePath);
        setState({ kind: "preview", diagram, files, options });
      }}
    />
  );
}
