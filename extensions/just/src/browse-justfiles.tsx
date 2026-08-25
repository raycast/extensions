import {
  ActionPanel,
  Action,
  Alert,
  Clipboard,
  Detail,
  Form,
  Icon,
  List,
  LocalStorage,
  confirmAlert,
  getPreferenceValues,
  Keyboard,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import React, { useState, useEffect } from "react";
import { execFile } from "node:child_process";
import {
  getUserShell,
  getAllJustfileFolders,
  getKnownJustfileFolders,
  restoreJustfileFoldersPreference,
  updateJustfileFolders,
  findJustfiles,
  parseRecipes,
  buildRecipeCmd,
  loadRecipesFromFolders,
  isPathLikeFolder,
  expandPath,
  type JustRecipe,
} from "./just-utils";

function buildDetailMarkdown(recipe: JustRecipe): string {
  const parts: string[] = [];

  if (recipe.doc) {
    const hasOtherContent =
      recipe.params.length > 0 || recipe.dependencies.length > 0;
    // With nothing between the hint and the code block, a hard-break + nbsp
    // adds one extra line of breathing room within the same paragraph,
    // instead of a whole extra paragraph's margin (too tall).
    parts.push(recipe.doc + (hasOtherContent ? "\n" : "  \n\u00A0\n"));
  }

  if (recipe.params.length > 0) {
    parts.push("**Parameters**\n");
    parts.push("| Name | Default |");
    parts.push("| ---- | ------- |");
    for (const p of recipe.params) {
      const def =
        p.kind === "star"
          ? "_variadic (optional)_"
          : p.kind === "plus"
            ? "_variadic (required)_"
            : p.defaultValue !== null
              ? `\`${p.defaultValue}\``
              : "_required_";
      parts.push(`| \`${p.name}\` | ${def} |`);
    }
    parts.push("");
  }

  if (recipe.dependencies.length > 0) {
    parts.push(`**Depends on:** ${recipe.dependencies.join(", ")}\n`);
  }

  if (recipe.body) {
    parts.push("```");
    parts.push(recipe.body);
    parts.push("```");
  }

  return parts.join("\n");
}

function RecipeOutput({
  recipe,
  args,
}: {
  recipe: JustRecipe;
  args: string[];
}) {
  const [markdown, setMarkdown] = useState("");
  const [rawOutput, setRawOutput] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const cmd = buildRecipeCmd(recipe, args);
    execFile(getUserShell(), ["-l", "-i", "-c", cmd], {}, (error, stdout) => {
      if (error) {
        setMarkdown(`**Error**\n~~~~\n${error.message}\n~~~~`);
        setRawOutput(error.message);
      } else {
        setMarkdown(`~~~~\n${stdout}\n~~~~`);
        setRawOutput(stdout);
      }
      setIsLoading(false);
    });
  }, []);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={`${recipe.folderName}: ${recipe.name}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Response" content={rawOutput} />
        </ActionPanel>
      }
    />
  );
}

// A `+` or `*` param accepts multiple positional arguments. This code splits
// the field's space-separated text into separate array entries, not one
// merged argument.
function argsFromFormValues(
  recipe: JustRecipe,
  typed: Record<string, string>,
): string[] {
  return recipe.params.flatMap((p) => {
    const value = typed[p.name] ?? "";
    if (p.kind === "singular") return [value];
    const tokens = value.trim().split(/\s+/).filter(Boolean);
    return tokens;
  });
}

function hasUnfulfilledRequired(recipe: JustRecipe): boolean {
  return recipe.params.some(
    (p) =>
      (p.kind === "singular" || p.kind === "plus") && p.defaultValue === null,
  );
}

function findMissingRequiredParams(
  recipe: JustRecipe,
  typed: Record<string, string>,
): string[] {
  return recipe.params
    .filter(
      (p) =>
        (p.kind === "singular" || p.kind === "plus") && p.defaultValue === null,
    )
    .filter((p) => !typed[p.name]?.trim())
    .map((p) => p.name);
}

function RecipeParamForm({
  recipe,
  onSubmit,
}: {
  recipe: JustRecipe;
  onSubmit: (args: string[]) => void;
}) {
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  return (
    <Form
      navigationTitle={`Run: ${recipe.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Run Recipe"
            onSubmit={(values) => {
              const typed = values as Record<string, string>;
              const missing = findMissingRequiredParams(recipe, typed);
              if (missing.length > 0) {
                setErrors(
                  Object.fromEntries(missing.map((n) => [n, "Required"])),
                );
                return false;
              }
              onSubmit(argsFromFormValues(recipe, typed));
            }}
          />
          <Action.SubmitForm
            title="Copy Command"
            shortcut={Keyboard.Shortcut.Common.Copy}
            onSubmit={(values) => {
              const typed = values as Record<string, string>;
              const missing = findMissingRequiredParams(recipe, typed);
              if (missing.length > 0) {
                setErrors(
                  Object.fromEntries(missing.map((n) => [n, "Required"])),
                );
                return false;
              }
              const args = argsFromFormValues(recipe, typed);
              void Clipboard.copy(buildRecipeCmd(recipe, args));
              void showHUD("Command copied");
            }}
          />
        </ActionPanel>
      }
    >
      {recipe.doc ? <Form.Description text={recipe.doc} /> : null}
      {recipe.params.map((p) => (
        <Form.TextField
          key={p.name}
          id={p.name}
          title={p.name}
          defaultValue={p.defaultValue ?? ""}
          placeholder={
            p.kind === "star"
              ? "Space-separated values (optional)"
              : p.kind === "plus"
                ? "Space-separated values (required)"
                : p.defaultValue !== null
                  ? `Default: ${p.defaultValue}`
                  : ""
          }
          error={errors[p.name]}
          onChange={() => {
            if (errors[p.name])
              setErrors((e) => ({ ...e, [p.name]: undefined }));
          }}
        />
      ))}
    </Form>
  );
}

function ManageFoldersForm({
  paths,
  justfileFoldersPref,
  onSave,
  onRestorePreference,
}: {
  paths: string[];
  justfileFoldersPref: string;
  onSave: (paths: string[]) => void;
  onRestorePreference: () => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [knownPaths, setKnownPaths] = useState<string[]>(paths);
  useEffect(() => {
    getKnownJustfileFolders(justfileFoldersPref).then(setKnownPaths);
  }, []);
  return (
    <Form
      navigationTitle="Manage Folders"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Folders"
            onSubmit={(values) => {
              const kept = (values.folders as string[] | undefined) ?? [];
              const added = (values.newFolders as string[] | undefined) ?? [];
              onSave(Array.from(new Set([...kept, ...added])));
              pop();
            }}
          />
          <Action
            title="Restore Justfile Folders"
            icon={Icon.ArrowClockwise}
            onAction={async () => {
              await onRestorePreference();
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TagPicker
        id="folders"
        title="Folders"
        info="The full set of folders currently searched for justfiles, including any from the Justfile Folders preference. Untag any to stop searching them. This never edits the Justfile Folders preference text itself; removing a preference-sourced folder is handled internally. Removed folders stay listed here so you can add them back without re-browsing for them, or use Restore Justfile Folders (⌘K) to re-include everything from the preference at once."
        defaultValue={paths}
      >
        {knownPaths.map((p) => (
          <Form.TagPicker.Item key={p} value={p} title={p} />
        ))}
      </Form.TagPicker>
      <Form.FilePicker
        id="newFolders"
        title="Add New Folder"
        info="Browse to add a folder not listed above."
        allowMultipleSelection
        canChooseDirectories
        canChooseFiles={false}
      />
    </Form>
  );
}

export default function Command(props: {
  arguments: Arguments.BrowseJustfiles;
}) {
  const {
    folder: folderArgument,
    recipe: recipeArgument,
    silent: silentArgument,
  } = props.arguments;
  const { justfileFolders = "" } = getPreferenceValues<Preferences>();
  const [recipes, setRecipes] = useState<JustRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState(
    [folderArgument, recipeArgument].filter(Boolean).join(" "),
  );
  const [selectedProject, setSelectedProject] = useState("");
  useEffect(() => {
    LocalStorage.getItem<string>("selectedProject").then((v) => {
      if (v) setSelectedProject(v);
    });
  }, []);
  // null = not yet loaded; gates the initial scan so it only runs once the
  // effective (preference + picked, minus excluded) path list is known.
  const [effectivePaths, setEffectivePaths] = useState<string[] | null>(null);
  useEffect(() => {
    getAllJustfileFolders(justfileFolders).then(setEffectivePaths);
  }, []);
  async function saveJustfileFolders(newPaths: string[]) {
    const updated = await updateJustfileFolders(justfileFolders, newPaths);
    setEffectivePaths(updated);
  }
  async function restorePreferenceFolders() {
    const updated = await restoreJustfileFoldersPreference(justfileFolders);
    setEffectivePaths(updated);
  }
  const [isShowingDetail, setIsShowingDetail] = useState(true);
  const [sortAlphabetically, setSortAlphabetically] = useState(false);
  useEffect(() => {
    LocalStorage.getItem<string>("sortAlphabetically").then((v) => {
      if (v) setSortAlphabetically(v === "true");
    });
  }, []);
  const [silentOverrides, setSilentOverrides] = useState<
    Record<string, boolean>
  >({});
  const navigation = useNavigation();

  useEffect(() => {
    LocalStorage.allItems().then((items) => {
      const overrides: Record<string, boolean> = {};
      for (const [key, value] of Object.entries(items)) {
        if (key.startsWith("silent_override:")) {
          overrides[key.slice("silent_override:".length)] = value === "on";
        }
      }
      setSilentOverrides(overrides);
    });
  }, []);

  function isEffectivelySilent(recipe: JustRecipe): boolean {
    const key = `${recipe.filePath}:${recipe.name}`;
    return key in silentOverrides ? silentOverrides[key] : recipe.isSilent;
  }

  async function toggleSilent(recipe: JustRecipe) {
    const current = isEffectivelySilent(recipe);
    const next = !current;
    const key = `${recipe.filePath}:${recipe.name}`;
    const storageKey = `silent_override:${key}`;
    if (next === recipe.isSilent) {
      await LocalStorage.removeItem(storageKey);
      setSilentOverrides((prev) => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    } else {
      await LocalStorage.setItem(storageKey, next ? "on" : "off");
      setSilentOverrides((prev) => ({ ...prev, [key]: next }));
    }
  }

  async function runRecipe(
    recipe: JustRecipe,
    args: string[],
    forceSilent?: boolean,
  ) {
    if (recipe.isConfirm) {
      const ok = await confirmAlert({
        title: `Run "${recipe.name}"?`,
        message: recipe.doc || "This recipe is marked [confirm].",
        primaryAction: { title: "Run", style: Alert.ActionStyle.Destructive },
      });
      if (!ok) return;
    }
    if (forceSilent ?? isEffectivelySilent(recipe)) {
      const cmd = buildRecipeCmd(recipe, args);
      execFile(
        getUserShell(),
        ["-l", "-i", "-c", cmd],
        {},
        async (error, stdout) => {
          const output = error ? error.message : stdout;
          const lastLine =
            output.trim().split("\n").filter(Boolean).pop() ??
            `${recipe.name} ✓`;
          await showHUD(lastLine);
        },
      );
    } else {
      navigation.push(<RecipeOutput recipe={recipe} args={args} />);
    }
  }

  function handleRunAction(recipe: JustRecipe) {
    if (recipe.params.length > 0) {
      navigation.push(
        <RecipeParamForm
          recipe={recipe}
          onSubmit={(args) => {
            void runRecipe(recipe, args);
          }}
        />,
      );
    } else {
      void runRecipe(recipe, []);
    }
  }

  useEffect(() => {
    if (effectivePaths === null) return;

    const justfiles = findJustfiles(effectivePaths);

    if (effectivePaths.length > 0 && justfiles.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "No justfiles found",
        message: effectivePaths.join(", "),
      });
    }

    const allRecipes: JustRecipe[] = [];
    for (const justfile of justfiles) {
      try {
        allRecipes.push(...parseRecipes(justfile));
      } catch {
        showToast({
          style: Toast.Style.Failure,
          title: "Could not parse",
          message: justfile,
        });
      }
    }

    setRecipes(allRecipes);
    setIsLoading(false);

    if (folderArgument && recipeArgument) {
      const pathLike = isPathLikeFolder(folderArgument);
      const candidates = pathLike
        ? loadRecipesFromFolders([expandPath(folderArgument)])
        : allRecipes;
      const tokens = (
        pathLike ? [recipeArgument] : [folderArgument, recipeArgument]
      )
        .join(" ")
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
      const matches = candidates.filter((r) =>
        tokens.every(
          (token) =>
            r.name.toLowerCase().includes(token) ||
            r.folderName.toLowerCase().includes(token),
        ),
      );
      if (matches.length === 1) {
        const recipe = matches[0];
        if (hasUnfulfilledRequired(recipe)) {
          navigation.push(
            <RecipeParamForm
              recipe={recipe}
              onSubmit={(args) => {
                void runRecipe(recipe, args, silentArgument ? true : undefined);
              }}
            />,
          );
        } else {
          void runRecipe(recipe, [], silentArgument ? true : undefined);
        }
      }
    }
  }, [effectivePaths]);

  const projects = Array.from(new Set(recipes.map((r) => r.folderName))).sort();

  const filteredRecipes = recipes.filter((recipe) => {
    if (recipe.isPrivate) return false;
    if (selectedProject && recipe.folderName !== selectedProject) return false;
    const tokens = searchText.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return tokens.every(
      (token) =>
        recipe.name.toLowerCase().includes(token) ||
        recipe.folderName.toLowerCase().includes(token) ||
        recipe.group?.toLowerCase().includes(token),
    );
  });
  if (sortAlphabetically) {
    filteredRecipes.sort((a, b) => a.name.localeCompare(b.name));
  }

  function renderRecipeItem(recipe: JustRecipe) {
    return (
      <List.Item
        key={`${recipe.filePath}::${recipe.name}`}
        title={recipe.name}
        subtitle={recipe.folderName}
        accessories={[
          ...(isEffectivelySilent(recipe) ? [{ icon: Icon.SpeakerOff }] : []),
          ...(!isShowingDetail ? [{ tag: recipe.doc || undefined }] : []),
        ]}
        keywords={[recipe.folderName, ...(recipe.group ? [recipe.group] : [])]}
        detail={<List.Item.Detail markdown={buildDetailMarkdown(recipe)} />}
        actions={
          <ActionPanel>
            <Action
              title="Run Recipe"
              onAction={() => handleRunAction(recipe)}
            />
            {hasUnfulfilledRequired(recipe) ? (
              <Action.Push
                title="Copy Command"
                shortcut={Keyboard.Shortcut.Common.Copy}
                target={
                  <RecipeParamForm
                    recipe={recipe}
                    onSubmit={(args) => {
                      void runRecipe(recipe, args);
                    }}
                  />
                }
              />
            ) : (
              <Action.CopyToClipboard
                title="Copy Command"
                content={buildRecipeCmd(recipe, [])}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            )}
            <Action
              title={
                isEffectivelySilent(recipe) ? "Run with Output" : "Run Silently"
              }
              icon={isEffectivelySilent(recipe) ? Icon.Eye : Icon.SpeakerOff}
              onAction={() => toggleSilent(recipe)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
            />
            <Action
              title={isShowingDetail ? "Hide Detail" : "Show Detail"}
              onAction={() => setIsShowingDetail((v) => !v)}
              shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
            />
            <Action
              title={
                sortAlphabetically ? "Sort Naturally" : "Sort Alphabetically"
              }
              onAction={() =>
                setSortAlphabetically((v) => {
                  const next = !v;
                  LocalStorage.setItem("sortAlphabetically", String(next));
                  return next;
                })
              }
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            />
            <Action.Push
              title="Manage Folders"
              icon={Icon.Folder}
              target={
                <ManageFoldersForm
                  paths={effectivePaths ?? []}
                  justfileFoldersPref={justfileFolders}
                  onSave={saveJustfileFolders}
                  onRestorePreference={restorePreferenceFolders}
                />
              }
            />
          </ActionPanel>
        }
      />
    );
  }

  const hasGroups = filteredRecipes.some((r) => r.group !== null);

  let listContent: React.ReactNode;
  if (hasGroups) {
    const byGroup: Record<string, JustRecipe[]> = {};
    for (const r of filteredRecipes) {
      const key = r.group ?? "";
      (byGroup[key] ??= []).push(r);
    }
    listContent = Object.entries(byGroup)
      .sort(([a], [b]) => {
        if (a === "") return 1;
        if (b === "") return -1;
        return a.localeCompare(b);
      })
      .map(([groupName, groupRecipes]) => (
        <List.Section
          key={groupName || "__ungrouped"}
          title={groupName || "Other"}
        >
          {groupRecipes.map(renderRecipeItem)}
        </List.Section>
      ));
  } else {
    listContent = filteredRecipes.map(renderRecipeItem);
  }

  const showEmptyState = !isLoading && recipes.length === 0;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Folder recipe…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by project"
          value={selectedProject}
          onChange={(v) => {
            setSelectedProject(v);
            LocalStorage.setItem("selectedProject", v);
          }}
        >
          <List.Dropdown.Item title="All Projects" value="" />
          {projects.map((name) => (
            <List.Dropdown.Item key={name} title={name} value={name} />
          ))}
        </List.Dropdown>
      }
    >
      {showEmptyState ? (
        <List.EmptyView
          title="No justfiles found"
          description="Use Manage Folders, or set the Justfile Folders preference."
          icon={Icon.Folder}
          actions={
            <ActionPanel>
              <Action.Push
                title="Manage Folders"
                icon={Icon.Folder}
                target={
                  <ManageFoldersForm
                    paths={effectivePaths ?? []}
                    justfileFoldersPref={justfileFolders}
                    onSave={saveJustfileFolders}
                    onRestorePreference={restorePreferenceFolders}
                  />
                }
              />
            </ActionPanel>
          }
        />
      ) : (
        listContent
      )}
    </List>
  );
}
