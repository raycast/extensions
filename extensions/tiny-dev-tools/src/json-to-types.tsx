import { useEffect, useState } from "react";
import { List, Action, ActionPanel, Icon, Keyboard, Toast, showToast, Clipboard } from "@raycast/api";
import { buildTypeTree, renderTypes, detectJson, type TargetLang } from "./lib/pure";
import { formatJson } from "./lib/pure";
import { usePrefill } from "./lib/prefill";

const LANGS: Array<{ id: TargetLang; label: string }> = [
  { id: "typescript", label: "TypeScript" },
  { id: "java", label: "Java" },
  { id: "go", label: "Go" },
  { id: "python", label: "Python" },
];

export default function Command() {
  const prefill = usePrefill(detectJson);
  const [query, setQuery] = useState("");
  const [lang, setLang] = useState<TargetLang>("typescript");

  // 预填注入：一次性写入 query state（List 型同款）
  useEffect(() => {
    if (prefill && !query) setQuery(prefill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  const tree = query.trim() ? buildTypeTree(query) : null;
  const parseError = (() => {
    if (!query.trim() || tree) return null;
    const r = formatJson(query, 0, false);
    return r.ok ? "Cannot infer types (object or array root required)" : `✗ ${r.error!.message}${r.error!.line ? ` (line ${r.error!.line}, col ${r.error!.column})` : ""}`;
  })();

  const fullCode = tree ? renderTypes(tree, lang) : "";
  const typeRows = tree?.named ?? [];

  const copy = async (label: string, content: string) => {
    await Clipboard.copy(content);
    await showToast(Toast.Style.Success, "Copied", label);
  };

  return (
    <List
      searchText={query}
      onSearchTextChange={setQuery}
      filtering={false}
      searchBarPlaceholder="Paste JSON to generate TypeScript / Java / Go / Python types"
      isShowingDetail={false}
    >
      {(() => {
        if (!query.trim()) {
          return (
            <List.EmptyView
              title="Paste JSON to generate type definitions"
              description="Copy an API response and open this command — it auto-prefills; switch languages, Enter to copy"
              icon={Icon.CodeBlock}
            />
          );
        }
        if (parseError) {
          return (
            <List.Item
              icon={Icon.ExclamationMark}
              title={parseError}
              subtitle="JSON parse failed or unsupported root type"
            />
          );
        }
        const actions = (label: string, content: string) => (
          <ActionPanel>
            <Action.CopyToClipboard
              title={`Copy${label}`}
              content={content}
              onCopy={async () => {
                await showToast(Toast.Style.Success, "Copied", label);
              }}
            />
            <Action
              title="Paste to Frontmost App"
              icon={Icon.Clipboard}
              shortcut={Keyboard.Shortcut.Common.Edit}
              onAction={async () => {
                await Clipboard.paste(content);
              }}
            />
          </ActionPanel>
        );
        return (
          <>
            {LANGS.map((l) => (
              <List.Item
                key={l.id}
                id={`lang-${l.id}`}
                icon={l.id === lang ? Icon.CircleFilled : Icon.Circle}
                title={l.label}
                subtitle={`Language${l.id === lang ? " · current" : ""}`}
                actions={
                  <ActionPanel>
                    <Action
                      title="Use This Language"
                      icon={Icon.Check}
                      onAction={() => setLang(l.id)}
                    />
                  </ActionPanel>
                }
              />
            ))}
            <List.Item
              id="full-code"
              icon={Icon.Clipboard}
              title="Full Code"
              subtitle={`${LANGS.find((l) => l.id === lang)!.label} · ${typeRows.length} types`}
              actions={actions("Full Code", fullCode)}
            />
            {typeRows.map((t) => (
              <List.Item
                key={t.name}
                id={t.name}
                icon={Icon.Tag}
                title={t.name}
                subtitle={`${t.node.fields.length} fields`}
                actions={actions(t.name, renderTypes({ root: t.node, named: [t] }, lang))}
              />
            ))}
          </>
        );
      })()}
    </List>
  );
}
