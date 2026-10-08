/**
 * VIEW RECIPES — The main command. One searchable list, pick a recipe, see it beautifully.
 *
 * HOW IT WORKS (pseudocode):
 *
 *   FUNCTION Command():
 *     // STEP 1: Load all .cook and .menu files from the recipe folder
 *     entries = walkRecipes(user's recipe folder)   ← recursive flat list
 *
 *     // STEP 2: Show a searchable list
 *     RENDER List(searchable):
 *       FOR EACH entry IN entries:
 *         name = friendly name (strip extension, replace dashes with spaces)
 *         icon = folder icon OR document icon
 *         action = Push RecipeDetail(path) if it's a file
 *                = Push SubDirView(path) if it's a folder
 *
 *   FUNCTION RecipeDetail(filePath):
 *     // STEP 1: Load and parse recipe
 *     json = runCook(["recipe", path, "-f", "json"])
 *     data = JSON.parse(json)
 *     md = recipeToMarkdown(data, path)      ← turn JSON into beautiful markdown
 *
 *     // STEP 2: Show it
 *     RENDER Detail(md) with actions:
 *       Enter → "Cooking Mode" button (step-by-step)
 *       "Open With" → open .cook file in VS Code
 *       "Copy File Path"
 *
 *   FUNCTION SubDirView(folderPath):
 *     // Same as top-level list but for a specific subfolder
 *     entries = listRecipes(folderPath)
 *     RENDER List(entries) with same push actions
 */

import {
  List,
  ActionPanel,
  Action,
  Icon,
  Detail,
  Form,
  Color,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { dirname } from "path";
import {
  getPreferences,
  listRecipes,
  friendlyName,
  runCook,
  recipeToMarkdown,
  validateRecipePath,
  DirEntry,
} from "./utils";
import { CookingMode } from "./cooking-mode";

// ── TOP-LEVEL: recipe list with search ──

export default function Command() {
  // entries = all .cook/.menu files (flat list, no nesting) for the searchable view
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // FUNCTION loadAllRecipes():
  //   IF recipe folder doesn't exist → stop loading
  //   TRY: entries = walkRecipes(folder) ← recursive, grabs every .cook/.menu
  //   CATCH: folder missing, empty, etc. → just show no results
  //   setLoading = false
  useEffect(() => {
    if (!validateRecipePath()) {
      setLoading(false);
      return;
    }
    try {
      const all = walkRecipes(getPreferences().recipePath);
      setEntries(all);
    } catch {
      /* folder missing or empty */
    }
    setLoading(false);
  }, []);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search recipes by name…"
      throttle
    >
      {/* EMPTY STATE: no recipes found */}
      {entries.length === 0 && !loading && (
        <List.EmptyView
          icon={Icon.Folder}
          title="No recipes found"
          description={`Place .cook files in ${getPreferences().recipePath}`}
        />
      )}
      {/* RENDER: each recipe/file as a list item */}
      {entries.map((e) => (
        <List.Item
          key={e.fullPath}
          title={friendlyName(e.name)}
          subtitle={
            e.isDir
              ? undefined
              : dirname(e.fullPath).replace(getPreferences().recipePath, "") ||
                "root"
          }
          icon={
            e.isDir
              ? Icon.Folder
              : e.name.endsWith(".menu")
                ? Icon.Calendar
                : Icon.Document
          }
          accessories={
            e.isDir ? [{ tag: { value: "dir", color: Color.Blue } }] : []
          }
          actions={
            <ActionPanel>
              {/* DIRECTORY → push a SubDirView to navigate deeper */}
              {e.isDir ? (
                <Action.Push
                  title="Open"
                  icon={Icon.Folder}
                  target={<SubDirView base={e.fullPath} />}
                />
              ) : (
                /* RECIPE FILE → push RecipeDetail (parsed + formatted) */
                <Action.Push
                  title="View Recipe"
                  icon={Icon.Eye}
                  target={<RecipeDetail filePath={e.fullPath} />}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// ── SUBFOLDER NAVIGATOR ──
//
// FUNCTION SubDirView(folderPath):
//   entries = listRecipes(folderPath)    ← use Node fs, no CookCLI needed
//   RENDER List(entries):
//     same as top-level: folders push SubDirView, files push RecipeDetail
//
function SubDirView({ base }: { base: string }) {
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      setEntries(listRecipes(base));
    } catch {
      /* empty folder */
    }
    setLoading(false);
  }, [base]);

  return (
    <List
      isLoading={loading}
      navigationTitle={base}
      searchBarPlaceholder="Filter…"
    >
      {entries.map((e) => (
        <List.Item
          key={e.fullPath}
          title={friendlyName(e.name)}
          icon={
            e.isDir
              ? Icon.Folder
              : e.name.endsWith(".menu")
                ? Icon.Calendar
                : Icon.Document
          }
          actions={
            <ActionPanel>
              {e.isDir ? (
                <Action.Push
                  title="Open"
                  icon={Icon.Folder}
                  target={<SubDirView base={e.fullPath} />}
                />
              ) : (
                <Action.Push
                  title="View Recipe"
                  icon={Icon.Eye}
                  target={<RecipeDetail filePath={e.fullPath} />}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// ── RECIPE DETAIL VIEW ──
//
// FUNCTION RecipeDetail(filePath):
//   state: md = "Loading..."
//
//   WHEN component mounts:
//     TRY:
//       json = runCook(["recipe", path, "-f", "json"])     ← ask CookCLI to parse
//       data = JSON.parse(json)                            ← text → object
//       md = recipeToMarkdown(data, path)                  ← object → beautiful markdown
//     CATCH:
//       md = error message
//
//   RENDER Detail(md) with actions:
//     Enter → "Cooking Mode" (step-by-step interactive)
//     "Open With" → opens .cook file in system editor
//     "Copy File Path" → clipboard
//
function RecipeDetail({ filePath }: { filePath: string }) {
  const [md, setMd] = useState("*Loading…*");
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);
  // Generation counter guards against stale CLI responses: if the user clicks
  // Scale 2X then Scale 4X before the first runCook returns, only the latest
  // request may update the view — otherwise the displayed markdown can show a
  // different scale than `scale` (which Cooking Mode would then use).
  const genRef = useRef(0);

  async function loadRecipe(s: number) {
    const gen = ++genRef.current;
    setLoading(true);
    setScale(s);
    try {
      const recipePath = s === 1 ? filePath : `${filePath}:${s}`;
      const json = await runCook(["recipe", recipePath, "-f", "json"]);
      if (gen !== genRef.current) return; // stale response — ignore
      setMd(recipeToMarkdown(JSON.parse(json), filePath));
    } catch {
      if (gen !== genRef.current) return; // stale response — ignore
      setMd(`# Error\n\nCould not parse recipe at ${filePath}`);
    } finally {
      if (gen === genRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    loadRecipe(1);
  }, [filePath]);

  return (
    <Detail
      isLoading={loading}
      markdown={md}
      actions={
        <ActionPanel>
          <Action.Push
            title="👨‍🍳 Cooking Mode"
            icon={Icon.Play}
            target={<CookingMode filePath={filePath} scale={scale} />}
          />
          <Action
            title="Scale ½X"
            icon={Icon.Minus}
            onAction={() => loadRecipe(0.5)}
          />
          <Action
            title="Scale 1X"
            icon={Icon.Circle}
            onAction={() => loadRecipe(1)}
          />
          <Action
            title="Scale 2X"
            icon={Icon.Plus}
            onAction={() => loadRecipe(2)}
          />
          <Action
            title="Scale 4X"
            icon={Icon.Plus}
            onAction={() => loadRecipe(4)}
          />
          <Action.Push
            title="Custom Scale…"
            icon={Icon.Pencil}
            target={<ScaleForm onScale={(s) => loadRecipe(s)} />}
          />
          <Action.OpenWith path={filePath} />
          <Action.CopyToClipboard title="Copy File Path" content={filePath} />
        </ActionPanel>
      }
    />
  );
}

// ── SCALE FORM ──
function ScaleForm({ onScale }: { onScale: (s: number) => void }) {
  const { pop } = useNavigation();
  function submit(v: { factor: string }) {
    const f = parseFloat(v.factor);
    if (!isNaN(f) && f > 0) {
      onScale(f);
      pop();
    }
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Apply Scale" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="factor"
        title="Scale Factor"
        placeholder="2"
        defaultValue="2"
      />
      <Form.Description text="Enter a multiplier. 2 = double, 0.5 = half." />
    </Form>
  );
}

// ── RECURSIVE FILE WALKER ──
//
// FUNCTION walkRecipes(dir):
//   // Recursively find ALL .cook and .menu files in a directory tree
//   result = []
//   FOR EACH entry IN listRecipes(dir):
//     IF entry is a folder:
//       result += walkRecipes(entry.path)    ← recurse into subfolder
//     ELSE:
//       result.push(entry)                   ← add file to flat list
//   RETURN result
//
// This gives us a flat list for the searchable view — no tree navigation needed
// for the top-level command. Folders still work via SubDirView when the user
// navigates into them from a folder item.
//
function walkRecipes(dir: string): DirEntry[] {
  const out: DirEntry[] = [];
  for (const e of listRecipes(dir)) {
    if (e.isDir) {
      out.push(...walkRecipes(e.fullPath));
    } else {
      out.push(e);
    }
  }
  return out;
}
