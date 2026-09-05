import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { loadBindings, runBinding } from "./lib/config";
import { GROUPS, type GroupId } from "./lib/dictionary";
import { recipeMarkdown, rowMarkdown } from "./lib/detail";
import { RECIPES, resolveRecipe, type ResolvedRecipe } from "./lib/recipes";
import { buildRows, type Row } from "./lib/rows";
import { Walkthrough } from "./walkthrough";
import { EditBinding } from "./editBinding";

export default function Command() {
  const [group, setGroup] = useState<GroupId | "all">("all");
  const { data, isLoading, error, revalidate } = useCachedPromise(async () => {
    const { bindings, configPath } = await loadBindings();
    return {
      configPath,
      rows: buildRows(bindings),
      recipes: RECIPES.map((r) => resolveRecipe(r, bindings)),
    };
  }, []);

  const rows = data?.rows ?? [];
  const recipes = data?.recipes ?? [];
  const visible = (id: GroupId) => group === "all" || group === id;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={!error && rows.length > 0}
      searchBarPlaceholder="Search a key, a command, or what you want to do…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by group" value={group} onChange={(v) => setGroup(v as GroupId | "all")}>
          <List.Dropdown.Item title="All groups" value="all" />
          {GROUPS.filter((g) => g.id === "recipes" || rows.some((r) => r.group === g.id)).map((g) => (
            <List.Dropdown.Item key={g.id} title={g.title} value={g.id} />
          ))}
        </List.Dropdown>
      }
    >
      {error && (
        <List.EmptyView
          icon={Icon.Warning}
          title="Couldn't read your AeroSpace config"
          description={error.message}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Aerospace Guide"
                url="https://nikitabobko.github.io/AeroSpace/guide#binding-modes"
              />
            </ActionPanel>
          }
        />
      )}

      {visible("recipes") && (
        <List.Section title="Recipes" subtitle="goal → keys">
          {recipes.map((recipe) => (
            <RecipeItem key={recipe.id} recipe={recipe} />
          ))}
        </List.Section>
      )}

      {GROUPS.filter((g) => g.id !== "recipes").map((g) => {
        const groupRows = rows.filter((r) => r.group === g.id);
        if (groupRows.length === 0 || !visible(g.id)) return null;
        return (
          <List.Section key={g.id} title={g.title} subtitle={g.subtitle}>
            {groupRows.map((row) => (
              <RowItem key={row.id} row={row} tint={g.tint} configPath={data?.configPath} onChanged={revalidate} />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

function RecipeItem({ recipe }: { recipe: ResolvedRecipe }) {
  const { push } = useNavigation();
  return (
    <List.Item
      icon={{ source: Icon.Stars, tintColor: Color.Yellow }}
      title={recipe.title}
      keywords={recipe.keywords}
      accessories={[
        recipe.missing.length > 0
          ? { tag: { value: "needs a binding", color: Color.Orange } }
          : { text: `${recipe.steps.length} steps` },
      ]}
      detail={<List.Item.Detail markdown={recipeMarkdown(recipe)} />}
      actions={
        <ActionPanel>
          <Action title="Open Walkthrough" icon={Icon.Book} onAction={() => push(<Walkthrough recipe={recipe} />)} />
        </ActionPanel>
      }
    />
  );
}

function RowItem({
  row,
  tint,
  configPath,
  onChanged,
}: {
  row: Row;
  tint: Color;
  configPath?: string;
  onChanged: () => void;
}) {
  const { push } = useNavigation();
  // A merged row stands for several bindings; edit the one whose key leads the row.
  const primary = row.bindings[0];
  return (
    <List.Item
      icon={{ source: row.icon, tintColor: tint }}
      title={row.title}
      keywords={row.keywords}
      accessories={row.keys.map((chip) => ({
        // The alternate spelling of a command is muted, so the eye lands on the
        // primary key first and reads the second as "or this".
        tag: { value: chip.display, color: chip.alternate ? Color.SecondaryText : Color.PrimaryText },
      }))}
      detail={
        <List.Item.Detail
          markdown={rowMarkdown(row)}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.TagList title="Keys">
                {row.keys.map((chip) => (
                  <List.Item.Detail.Metadata.TagList.Item
                    key={chip.display}
                    text={chip.display}
                    color={chip.alternate ? Color.SecondaryText : Color.PrimaryText}
                  />
                ))}
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Command" text={row.command} />
              <List.Item.Detail.Metadata.Label title="Mode" text={row.mode} />
              {row.entry?.undo && (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Undo with" text={row.entry.undo} />
                </>
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Try It"
              icon={Icon.Play}
              onAction={async () => {
                try {
                  await runBinding(row.bindings[0]);
                } catch (e) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Couldn't run that",
                    message: e instanceof Error ? e.message : String(e),
                  });
                }
              }}
            />
            <Action
              title="Edit Binding"
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              onAction={() =>
                push(
                  <EditBinding
                    target={{ mode: primary.mode, key: primary.key, command: primary.command }}
                    onSaved={onChanged}
                  />,
                )
              }
            />
            <Action
              title="Add Binding"
              icon={Icon.Plus}
              shortcut={Keyboard.Shortcut.Common.New}
              onAction={() => push(<EditBinding target={{ mode: primary.mode }} onSaved={onChanged} />)}
            />
            <Action.CopyToClipboard title="Copy Keys" content={row.keys.map((k) => k.display).join(" / ")} />
            <Action.CopyToClipboard
              title="Copy Command"
              content={row.command}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          </ActionPanel.Section>
          {configPath && (
            <ActionPanel.Section>
              <Action.Open title="Open Config" target={configPath} icon={Icon.Document} />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
