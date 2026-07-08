/**
 * SHOPPING LIST — Mark recipes, generate a combined ingredient list, copy to clipboard.
 *
 * HOW IT WORKS (pseudocode):
 *
 *   FUNCTION Command():
 *     // STEP 1: Load all recipes
 *     recipes = flatRecipes(user's recipe folder)   ← flat list, no folders
 *
 *     // STEP 2: Show as a checklist
 *     state: selected = Set()          ← which recipes are checked
 *     RENDER List(recipes):
 *       FOR EACH recipe:
 *         icon = checked (✓) OR unchecked (○)
 *         click → toggle: add to selected OR remove from selected
 *         IF any recipes are selected:
 *           show "Generate List (N)" button
 *
 *     // STEP 3: When user clicks "Generate List"
 *     Push ShoppingResult(selected paths)
 *
 *   FUNCTION ShoppingResult(paths):
 *     // Run CookCLI: cook shopping-list recipe1.cook recipe2.cook ...
 *     output = runCook(["shopping-list", ...paths])
 *     // Clean % unit separators (CookCLI uses % between value and unit)
 *     cleaned = replace % letter with " letter" (250%g → 250 g)
 *     RENDER Detail(cleaned in code block):
 *       action: "Copy Shopping List" → strips ``` fences, copies to clipboard
 */

import { List, ActionPanel, Action, Icon, Detail } from "@raycast/api";
import { useState, useEffect } from "react";
import { listRecipes, friendlyName, runCook, DirEntry, getPreferences } from "./utils";
import { basename } from "path";

export default function Command() {
  // recipes = flat list of ALL .cook/.menu files (no folders)
  const [recipes, setRecipes] = useState<DirEntry[]>([]);
  // selected = which recipe paths the user has checked
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Load all recipes once on mount
  useEffect(() => {
    try { setRecipes(flatRecipes(getPreferences().recipePath)); } catch { /* empty */ }
    setLoading(false);
  }, []);

  // FUNCTION toggle(path):
  //   // Add or remove a recipe from the selected set
  //   clone = new Set(current selection)     ← never mutate state directly
  //   IF path is in clone → delete it (deselect)
  //   ELSE → add it (select)
  //   RETURN clone
  function toggle(path: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
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
              {/* Toggle this recipe in/out of selection */}
              <Action title={selected.has(r.fullPath) ? "Deselect" : "Select"}
                icon={selected.has(r.fullPath) ? Icon.XmarkCircle : Icon.PlusCircle}
                onAction={() => toggle(r.fullPath)} />
              {/* Generate button — only shows when something is selected */}
              {selected.size > 0 && (
                <Action.Push title={`Generate List (${selected.size})`} icon={Icon.Cart}
                  target={<ShoppingResult paths={Array.from(selected)} />} />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// ── SHOPPING LIST RESULT VIEW ──
//
// Runs cook shopping-list with all selected recipes, shows the result,
// and provides a "Copy to Clipboard" action.
//
function ShoppingResult({ paths }: { paths: string[] }) {
  const [output, setOutput] = useState("*Generating…*");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = runCook(["shopping-list", ...paths]);
      // Clean CookCLI % unit separator: "250%g" → "250 g"
      const cleaned = raw.replace(/%([a-zA-Z]+)/g, " $1").replace(/%([A-Z])/g, " $1");
      setOutput(cleaned);
    } catch (err) {
      setOutput(`# Error\n\n${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [paths]);

  // Use the raw cleaned output directly for clipboard

  return (
    <Detail isLoading={loading} markdown={output}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Shopping List" content={output} />
        </ActionPanel>
      }
    />
  );
}

// ── RECURSIVE FLAT LIST ──
//
// FUNCTION flatRecipes(dir):
//   // Walk a directory tree and return ALL .cook/.menu files (not folders)
//   result = []
//   FOR EACH entry IN listRecipes(dir):
//     IF entry is a folder:
//       result += flatRecipes(entry.path)    ← recurse
//     ELSE:
//       result.push(entry)                   ← it's a recipe file
//   RETURN result
//
function flatRecipes(dir: string): DirEntry[] {
  const out: DirEntry[] = [];
  for (const e of listRecipes(dir)) {
    if (e.isDir) out.push(...flatRecipes(e.fullPath));
    else out.push(e);
  }
  return out;
}
