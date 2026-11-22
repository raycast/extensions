import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { strings } from "@/strings";
import type { Project } from "@/core/projects/types";
import { slugify, type TaxonomyOption } from "@/core/metadata/taxonomy";
import {
  getPinnedCollections,
  movePinnedCollection,
  removePinnedCollection,
  togglePinnedCollection,
} from "@/core/metadata/collection-pins";
import { collectionTaxonomy } from "@/core/metadata/taxonomies";
import { removeCollectionEverywhere } from "@/core/metadata/project-metadata";
import { removeTrackMap } from "@/core/metadata/collection-order";
import { removeRoleMap } from "@/core/metadata/collection-roles";
import { sameName } from "@/core/ui/collections/tracklist";
import { CollectionPanel } from "@/core/ui/collections/tracklist-view";

function CollectionNameForm(props: {
  title: string;
  currentName?: string;
  onSubmit: (name: string) => Promise<boolean>;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");

  return (
    <Form
      navigationTitle={props.title}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={strings.save}
            onSubmit={async () => {
              const trimmed = name.trim();
              if (trimmed === "") {
                // 留空：重命名时视为不改动直接返回；新建时提示名称无效。
                if (props.currentName !== undefined) {
                  pop();
                  return;
                }
                await showToast({ style: Toast.Style.Failure, title: strings.invalidName });
                return;
              }
              // 返回 false（如重名）时留在表单里，方便直接改。
              if (await props.onSubmit(trimmed)) pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title={strings.name} placeholder={props.currentName} value={name} onChange={setName} />
    </Form>
  );
}

export function CollectionList({
  projects: initialProjects,
  collections: initialCollections,
  stages,
  genres,
}: {
  projects: Project[];
  collections: TaxonomyOption[];
  stages: TaxonomyOption[];
  genres: TaxonomyOption[];
}) {
  const { pop } = useNavigation();
  const [collections, setCollections] = useState<TaxonomyOption[]>(initialCollections);
  // 推入时拿到的是快照；合集面板里的改动会通过 onProjectsChanged 回传到这里。
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

  useEffect(() => {
    void getPinnedCollections().then(setPinnedIds);
  }, []);

  async function reloadCollections() {
    setCollections(await collectionTaxonomy.get());
  }

  async function togglePin(id: string) {
    setPinnedIds(await togglePinnedCollection(id));
  }

  async function movePin(id: string, direction: "up" | "down") {
    setPinnedIds(await movePinnedCollection(id, direction));
  }

  // 按显示名判重（不区分大小写）。id 仍由 slug 生成；slug 撞了就加 -2、-3…，避免 Demo! 与 Demo 被误判重名。
  async function createCollection(name: string): Promise<boolean> {
    const current = await collectionTaxonomy.get();
    if (current.some((o) => sameName(o.name, name))) {
      await showToast({ style: Toast.Style.Failure, title: strings.collectionNameExists });
      return false;
    }
    const base = slugify(name);
    let id = base;
    for (let n = 2; current.some((o) => o.id === id); n++) {
      id = `${base}-${n}`;
    }
    const option: TaxonomyOption = { id, name };
    await collectionTaxonomy.save([...current, option]);
    await reloadCollections();
    await showToast({ style: Toast.Style.Success, title: strings.created });
    return true;
  }

  async function renameCollection(id: string, name: string): Promise<boolean> {
    const current = await collectionTaxonomy.get();
    if (current.some((o) => o.id !== id && sameName(o.name, name))) {
      await showToast({ style: Toast.Style.Failure, title: strings.collectionNameExists });
      return false;
    }
    await collectionTaxonomy.save(current.map((o) => (o.id === id ? { ...o, name } : o)));
    await reloadCollections();
    await showToast({ style: Toast.Style.Success, title: strings.renamed });
    return true;
  }

  async function deleteCollection(c: TaxonomyOption) {
    const confirmed = await confirmAlert({
      icon: { source: Icon.Trash, tintColor: Color.Red },
      title: `${strings.delete} “${c.name}”?`,
      message: strings.deleteCollectionHint,
      primaryAction: { title: strings.delete, style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const current = await collectionTaxonomy.get();
    await collectionTaxonomy.save(current.filter((o) => o.id !== c.id));

    // 清理与该合集 id 关联的残留数据，避免重建同名合集（slug 得出同 id）时旧状态复活。
    await removeCollectionEverywhere(c.id);
    await removeTrackMap(c.id);
    await removeRoleMap(c.id);
    setPinnedIds(await removePinnedCollection(c.id));

    await reloadCollections();
    await showToast({ style: Toast.Style.Success, title: strings.deleted });
  }

  const createAction = (
    <Action.Push
      title={strings.create}
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<CollectionNameForm title={strings.create} onSubmit={createCollection} />}
    />
  );

  const pinnedCollections = pinnedIds
    .map((id) => collections.find((c) => c.id === id))
    .filter((c): c is TaxonomyOption => c !== undefined);
  const unpinnedCollections = collections.filter((c) => !pinnedIds.includes(c.id));

  const renderItem = (c: TaxonomyOption, options: { isPinned: boolean; index: number; total: number }) => {
    const count = projects.filter((p) => p.collectionIds.includes(c.id)).length;
    return (
      <List.Item
        key={c.id}
        icon="collection.png"
        title={c.name}
        accessories={[{ text: count === 1 ? "1 Track(s)" : `${count} Track(s)` }]}
        actions={
          <ActionPanel>
            <Action.Push
              title={strings.open}
              icon={Icon.Tray}
              target={
                <CollectionPanel
                  collection={c}
                  projects={projects}
                  stages={stages}
                  genres={genres}
                  onProjectsChanged={setProjects}
                />
              }
            />
            {createAction}
            <Action.Push
              title={strings.rename}
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              target={
                <CollectionNameForm
                  title={strings.rename}
                  currentName={c.name}
                  onSubmit={(name) => renameCollection(c.id, name)}
                />
              }
            />
            <ActionPanel.Section title={strings.sectionPin}>
              <Action
                title={options.isPinned ? strings.unpinProject : strings.pinProject}
                icon={options.isPinned ? Icon.TackDisabled : Icon.Tack}
                shortcut={Keyboard.Shortcut.Common.Pin}
                onAction={() => togglePin(c.id)}
              />
              {options.isPinned && options.index > 0 && (
                <Action
                  title={strings.moveUp}
                  icon={Icon.ArrowUp}
                  shortcut={Keyboard.Shortcut.Common.MoveUp}
                  onAction={() => movePin(c.id, "up")}
                />
              )}
              {options.isPinned && options.index < options.total - 1 && (
                <Action
                  title={strings.moveDown}
                  icon={Icon.ArrowDown}
                  shortcut={Keyboard.Shortcut.Common.MoveDown}
                  onAction={() => movePin(c.id, "down")}
                />
              )}
            </ActionPanel.Section>
            <ActionPanel.Section title={strings.sectionNavigate}>
              <Action
                title={strings.backToProjects}
                icon={Icon.Compass}
                shortcut={{ modifiers: ["ctrl"], key: "return" }}
                onAction={pop}
              />
            </ActionPanel.Section>
            <ActionPanel.Section title={strings.sectionDangerZone}>
              <Action
                title={strings.delete}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => deleteCollection(c)}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List navigationTitle={strings.browseCollections} searchBarPlaceholder={strings.searchCollections}>
      {collections.length === 0 ? (
        <List.EmptyView title={strings.noCategories} actions={<ActionPanel>{createAction}</ActionPanel>} />
      ) : (
        <>
          {pinnedCollections.length > 0 && (
            <List.Section title={strings.pinned}>
              {pinnedCollections.map((c, index) =>
                renderItem(c, { isPinned: true, index, total: pinnedCollections.length }),
              )}
            </List.Section>
          )}
          <List.Section title={strings.collections}>
            {unpinnedCollections.map((c) =>
              renderItem(c, { isPinned: false, index: 0, total: unpinnedCollections.length }),
            )}
          </List.Section>
        </>
      )}
    </List>
  );
}
