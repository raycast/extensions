import {
  ActionPanel,
  Action,
  Alert,
  Clipboard,
  Detail,
  Form,
  Icon,
  List,
  confirmAlert,
  getPreferenceValues,
  Keyboard,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise, useCachedState, usePromise } from "@raycast/utils";
import React, { useState, useEffect, useRef } from "react";
import { execFile } from "node:child_process";
import {
  getUserShell,
  getKnownJustfileFolders,
  restoreJustfileFoldersPreference,
  updateJustfileFolders,
  buildRecipeCmd,
  loadRecipesFromFolders,
  isPathLikeFolder,
  expandPath,
  ensureJustInstalled,
  getAllJustfileFolders,
  type JustRecipe,
} from "./just-utils";

async function loadBrowseData(justfileFoldersPref: string) {
  ensureJustInstalled();
  const paths = await getAllJustfileFolders(justfileFoldersPref);
  const parseErrors: string[] = [];
  const recipes = loadRecipesFromFolders(paths, (jf) => parseErrors.push(jf));
  return { paths, recipes, parseErrors };
}

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
  const cmd = buildRecipeCmd(recipe, args);
  const { isLoading, data, error } = usePromise(
    (command: string) =>
      new Promise<string>((resolve, reject) => {
        execFile(
          getUserShell(),
          ["-l", "-i", "-c", command],
          {},
          (err, stdout) => {
            if (err) reject(err);
            else resolve(stdout);
          },
        );
      }),
    [cmd],
    { onError: () => undefined },
  );
  const rawOutput = error ? error.message : (data ?? "");
  const markdown = error
    ? `**Error**\n~~~~\n${rawOutput}\n~~~~`
    : data !== undefined
      ? `~~~~\n${data}\n~~~~`
      : "";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={`${recipe.folderName}: ${recipe.name}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Output" content={rawOutput} />
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
  primaryAction = "run",
  onSubmit,
}: {
  recipe: JustRecipe;
  primaryAction?: "run" | "copy";
  onSubmit: (args: string[]) => void;
}) {
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const runAction = (
    <Action.SubmitForm
      key="run"
      title="Run Recipe"
      icon={Icon.Play}
      onSubmit={(values) => {
        const typed = values as Record<string, string>;
        const missing = findMissingRequiredParams(recipe, typed);
        if (missing.length > 0) {
          setErrors(Object.fromEntries(missing.map((n) => [n, "Required"])));
          return false;
        }
        onSubmit(argsFromFormValues(recipe, typed));
      }}
    />
  );

  const copyAction = (
    <Action.SubmitForm
      key="copy"
      title="Copy Command"
      icon={Icon.Clipboard}
      shortcut={Keyboard.Shortcut.Common.Copy}
      onSubmit={(values) => {
        const typed = values as Record<string, string>;
        const missing = findMissingRequiredParams(recipe, typed);
        if (missing.length > 0) {
          setErrors(Object.fromEntries(missing.map((n) => [n, "Required"])));
          return false;
        }
        const args = argsFromFormValues(recipe, typed);
        void Clipboard.copy(buildRecipeCmd(recipe, args));
        void showHUD("Command copied");
      }}
    />
  );

  return (
    <Form
      navigationTitle={`Run: ${recipe.name}`}
      actions={
        <ActionPanel>
          {primaryAction === "copy"
            ? [copyAction, runAction]
            : [runAction, copyAction]}
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
                  : "Required"
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
  }, [justfileFoldersPref]);
  return (
    <Form
      navigationTitle="Manage Folders"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Folders"
            icon={Icon.Check}
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
  const { data, isLoading, error, revalidate } = useCachedPromise(
    loadBrowseData,
    [justfileFolders],
    {
      onData: (result) => {
        if (
          result.paths.length > 0 &&
          result.recipes.length === 0 &&
          result.parseErrors.length === 0
        ) {
          showToast({
            style: Toast.Style.Failure,
            title: "No justfiles found",
            message: result.paths.join(", "),
          });
        }
        for (const justfile of result.parseErrors) {
          showToast({
            style: Toast.Style.Failure,
            title: "Could not parse",
            message: justfile,
          });
        }
      },
      failureToastOptions: { title: "just not found" },
    },
  );
  const recipes = data?.recipes ?? [];
  const effectivePaths = data?.paths ?? [];
  const [searchText, setSearchText] = useState(
    [folderArgument, recipeArgument].filter(Boolean).join(" "),
  );
  const [selectedProject, setSelectedProject] = useCachedState(
    "selectedProject",
    "",
  );
  async function saveJustfileFolders(newPaths: string[]) {
    await updateJustfileFolders(justfileFolders, newPaths);
    await revalidate();
  }
  async function restorePreferenceFolders() {
    await restoreJustfileFoldersPreference(justfileFolders);
    await revalidate();
  }
  const [isShowingDetail, setIsShowingDetail] = useState(true);
  const [sortAlphabetically, setSortAlphabetically] = useCachedState(
    "sortAlphabetically",
    false,
  );
  const [silentOverrides, setSilentOverrides] = useCachedState<
    Record<string, boolean>
  >("silentOverrides", {});
  const navigation = useNavigation();
  const didAutoRun = useRef(false);

  function isEffectivelySilent(recipe: JustRecipe): boolean {
    const key = `${recipe.filePath}:${recipe.name}`;
    return key in silentOverrides ? silentOverrides[key] : recipe.isSilent;
  }

  function toggleSilent(recipe: JustRecipe) {
    const current = isEffectivelySilent(recipe);
    const next = !current;
    const key = `${recipe.filePath}:${recipe.name}`;
    setSilentOverrides((prev) => {
      if (next === recipe.isSilent) {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      }
      return { ...prev, [key]: next };
    });
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
    if (!data || didAutoRun.current || !folderArgument || !recipeArgument) {
      return;
    }
    didAutoRun.current = true;
    const pathLike = isPathLikeFolder(folderArgument);
    const candidates = pathLike
      ? loadRecipesFromFolders([expandPath(folderArgument)])
      : data.recipes;
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
  }, [data]);

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
              icon={Icon.Play}
              onAction={() => handleRunAction(recipe)}
            />
            {hasUnfulfilledRequired(recipe) ? (
              <Action.Push
                title="Copy Command"
                icon={Icon.Clipboard}
                shortcut={Keyboard.Shortcut.Common.Copy}
                target={
                  <RecipeParamForm
                    recipe={recipe}
                    primaryAction="copy"
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
              icon={isShowingDetail ? Icon.EyeDisabled : Icon.Eye}
              onAction={() => setIsShowingDetail((v) => !v)}
              shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
            />
            <Action
              title={
                sortAlphabetically ? "Sort Naturally" : "Sort Alphabetically"
              }
              icon={Icon.ArrowUp}
              onAction={() => setSortAlphabetically((v) => !v)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            />
            <Action.Push
              title="Manage Folders"
              icon={Icon.Folder}
              target={
                <ManageFoldersForm
                  paths={effectivePaths}
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

  const showEmptyState = !isLoading && (Boolean(error) || recipes.length === 0);

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
          onChange={setSelectedProject}
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
          title={error ? "just not found" : "No justfiles found"}
          description={
            error
              ? error.message
              : "Use Manage Folders, or set the Justfile Folders preference."
          }
          icon={error ? Icon.Warning : Icon.Folder}
          actions={
            error ? undefined : (
              <ActionPanel>
                <Action.Push
                  title="Manage Folders"
                  icon={Icon.Folder}
                  target={
                    <ManageFoldersForm
                      paths={effectivePaths}
                      justfileFoldersPref={justfileFolders}
                      onSave={saveJustfileFolders}
                      onRestorePreference={restorePreferenceFolders}
                    />
                  }
                />
              </ActionPanel>
            )
          }
        />
      ) : (
        listContent
      )}
    </List>
  );
}
