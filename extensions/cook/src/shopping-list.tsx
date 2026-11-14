import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import {
  listRecipes,
  friendlyName,
  runCook,
  DirEntry,
  getPreferences,
} from "./utils";
import { basename } from "path";

export default function Command() {
  const [recipes, setRecipes] = useState<DirEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      setRecipes(flatRecipes(getPreferences().recipePath));
    } catch {
      /* empty */
    }
    setLoading(false);
  }, []);

  function toggle(path: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Search recipes…">
      {recipes.length === 0 && !loading && (
        <List.EmptyView icon={Icon.Folder} title="No recipes found" />
      )}
      {recipes.map((r) => (
        <List.Item
          key={r.fullPath}
          title={friendlyName(r.name)}
          subtitle={basename(r.fullPath)}
          icon={selected.has(r.fullPath) ? Icon.CheckCircle : Icon.Circle}
          accessories={selected.has(r.fullPath) ? [{ text: "✓ selected" }] : []}
          actions={
            <ActionPanel>
              <Action
                title={selected.has(r.fullPath) ? "Deselect" : "Select"}
                icon={
                  selected.has(r.fullPath) ? Icon.XmarkCircle : Icon.PlusCircle
                }
                onAction={() => toggle(r.fullPath)}
              />
              {selected.size > 0 && (
                <Action.Push
                  title={`Generate List (${selected.size})`}
                  icon={Icon.Cart}
                  target={<ShoppingResult paths={Array.from(selected)} />}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// ── SHOPPING LIST PARSER ──
//
// CookCLI shopping-list output format:
//   [category name]
//   item name               quantity
//   item name
//
// Items are tabular — name left-aligned, quantity right-aligned with whitespace.

interface ShopItem {
  name: string;
  quantity: string;
}
interface ShopSection {
  name: string;
  items: ShopItem[];
}

function parseShoppingList(raw: string): {
  sections: ShopSection[];
  raw: string;
} {
  const lines = raw.split("\n");
  const sections: ShopSection[] = [];
  let current: ShopSection | null = null;

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;

    // Category header: [category name]
    if (/^\[.+\]$/.test(t)) {
      current = { name: t.slice(1, -1), items: [] };
      sections.push(current);
      continue;
    }

    if (current) {
      // Item: name (spaces) quantity — split on 2+ spaces
      const match = t.match(/^(.+?)\s{2,}(.+)$/);
      if (match) {
        current.items.push({
          name: match[1].trim(),
          quantity: match[2].trim(),
        });
      } else {
        current.items.push({ name: t, quantity: "" });
      }
    }
  }

  const rawCleaned = raw.replace(/%([a-zA-Z]+)/g, " $1");
  return { sections, raw: rawCleaned };
}

// ── SHOPPING RESULT VIEW ──

function ShoppingResult({ paths }: { paths: string[] }) {
  const [sections, setSections] = useState<ShopSection[]>([]);
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadShoppingList() {
      try {
        const raw = await runCook(["shopping-list", ...paths]);
        const parsed = parseShoppingList(raw);
        if (!cancelled) {
          setSections(parsed.sections);
          setRawText(parsed.raw);
        }
      } catch {
        /* handled by empty view */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadShoppingList();
    return () => {
      cancelled = true;
    };
  }, [paths]);

  return (
    <List
      isLoading={loading}
      navigationTitle="Shopping List"
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy as Text" content={rawText} />
        </ActionPanel>
      }
    >
      {sections.length === 0 && !loading && (
        <List.EmptyView icon={Icon.Cart} title="No items" />
      )}
      {sections.map((sec) => (
        <List.Section key={sec.name} title={sec.name}>
          {sec.items.map((item, i) => (
            <List.Item
              key={`${sec.name}-${i}`}
              title={item.name}
              accessories={item.quantity ? [{ text: item.quantity }] : []}
              icon={
                item.name.startsWith("?")
                  ? { source: Icon.QuestionMark, tintColor: Color.Yellow }
                  : Icon.Circle
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function flatRecipes(dir: string): DirEntry[] {
  const out: DirEntry[] = [];
  for (const e of listRecipes(dir)) {
    if (e.isDir) out.push(...flatRecipes(e.fullPath));
    else out.push(e);
  }
  return out;
}
