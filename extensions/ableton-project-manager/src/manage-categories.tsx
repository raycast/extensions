import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { slugify, Taxonomy, TaxonomyOption } from "@/core/metadata/taxonomy";
import { stageTaxonomy, genreTaxonomy, roleTaxonomy } from "@/core/metadata/taxonomies";
import { countRoleUsage, deleteRoleEverywhere, renameRoleEverywhere } from "@/core/metadata/collection-roles";
import {
  getAllProjectMetadata,
  removeGenreEverywhere,
  removeStageEverywhere,
  setGenreMembers,
  setStageMembers,
  type ProjectMetadata,
} from "@/core/metadata/project-metadata";
import { loadProjects } from "@/core/projects/load-projects";
import type { Project } from "@/core/projects/types";
import { showFailure } from "@/core/ui/toast";
import { getSettings } from "./settings";
import { getTranslations } from "./i18n";

const settings = getSettings();
const t = getTranslations(settings.language);

type CategoryKind = "stage" | "genre" | "role";
// 能直接打在项目上的分类。Role 只在合集里生效，不能脱离合集指定。
type ProjectTagKind = Exclude<CategoryKind, "role">;

// 搜索栏占位文字跟着下拉框切换。
const SEARCH_PLACEHOLDERS: Record<CategoryKind, string> = {
  stage: t.searchStages,
  genre: t.searchGenres,
  role: t.searchRoles,
};

const TAXONOMIES: Record<CategoryKind, Taxonomy> = {
  stage: stageTaxonomy,
  genre: genreTaxonomy,
  role: roleTaxonomy,
};

const COLOR_CHOICES: { label: string; value: Color }[] = [
  { label: "Blue", value: Color.Blue },
  { label: "Green", value: Color.Green },
  { label: "Yellow", value: Color.Yellow },
  { label: "Orange", value: Color.Orange },
  { label: "Red", value: Color.Red },
  { label: "Magenta", value: Color.Magenta },
  { label: "Purple", value: Color.Purple },
  { label: "Primary", value: Color.PrimaryText },
  { label: "Secondary", value: Color.SecondaryText },
];

// 读不到项目文件夹（外接盘未接等）时当作没有项目。
function loadProjectsSafely(): Project[] {
  try {
    return loadProjects(settings.projectsFolder).sort((a, b) => a.title.localeCompare(b.title));
  } catch {
    return [];
  }
}

function hasTag(meta: ProjectMetadata | undefined, kind: ProjectTagKind, id: string): boolean {
  return kind === "stage" ? meta?.stageId === id : (meta?.genreIds ?? []).includes(id);
}

function CategoryForm(props: {
  title: string;
  currentName?: string;
  showColor?: boolean;
  currentColor?: Color;
  onSubmit: (name: string, color?: Color) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [color, setColor] = useState<Color>(props.currentColor ?? Color.Blue);

  return (
    <Form
      navigationTitle={props.title}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t.save}
            onSubmit={async () => {
              const trimmed = name.trim();
              const finalName = trimmed === "" ? (props.currentName ?? "") : trimmed;
              if (finalName === "") {
                await showToast({ style: Toast.Style.Failure, title: t.invalidName });
                return;
              }
              await props.onSubmit(finalName, props.showColor ? color : undefined);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title={t.name} placeholder={props.currentName} value={name} onChange={setName} />
      {props.showColor && (
        <Form.Dropdown id="color" title={t.color} value={color} onChange={(value) => setColor(value as Color)}>
          {COLOR_CHOICES.map((choice) => (
            <Form.Dropdown.Item
              key={choice.value}
              value={choice.value}
              title={choice.label}
              icon={{ source: Icon.Circle, tintColor: choice.value }}
            />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}

// 从标签出发批量打标：已有这个标签的项目预先勾上；勾上就加，取消就去掉。
function AssignProjectsForm({ kind, option }: { kind: ProjectTagKind; option: TaxonomyOption }) {
  const { pop } = useNavigation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [initial, setInitial] = useState<string[]>([]);
  // Stage 是单选：记下每个项目现在的 Stage，勾选后会被改掉的要在表单里写明。
  const [currentStages, setCurrentStages] = useState<Record<string, string | null>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const list = loadProjectsSafely();
      const store = await getAllProjectMetadata();
      const tagged = list.filter((p) => hasTag(store[p.id], kind, option.id)).map((p) => p.id);
      setProjects(list);
      setSelected(tagged);
      setInitial(tagged);
      setCurrentStages(Object.fromEntries(list.map((p) => [p.id, store[p.id]?.stageId ?? null])));
      setIsLoading(false);
    }
    void load();
  }, [kind, option.id]);

  const movingStage =
    kind === "stage"
      ? selected.filter((id) => {
          const stage = currentStages[id];
          return stage != null && stage !== option.id;
        }).length
      : 0;

  async function handleSubmit() {
    const added = selected.filter((id) => !initial.includes(id)).length;
    const removed = initial.filter((id) => !selected.includes(id)).length;
    if (added === 0 && removed === 0) {
      await showToast({ style: Toast.Style.Success, title: t.noChanges });
      pop();
      return;
    }
    const candidates = projects.map((p) => p.id);
    try {
      if (kind === "stage") await setStageMembers(option.id, selected, candidates);
      else await setGenreMembers(option.id, selected, candidates);
    } catch (error) {
      await showFailure(t.saveFailed, error);
      return;
    }
    await showToast({ style: Toast.Style.Success, title: t.tagsAssigned, message: `+${added} · −${removed}` });
    pop();
  }

  const hint =
    movingStage > 0
      ? `${t.assignFormHint}\n\n${t.assignStageMoveHint.replace("{count}", String(movingStage))}`
      : t.assignFormHint;

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`${t.assignToProjects} — ${option.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t.save} icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {!isLoading && projects.length === 0 && <Form.Description text={t.noProjectsFound} />}
      {projects.length > 0 && (
        <Form.TagPicker id="projects" title={t.projects} value={selected} onChange={setSelected}>
          {projects.map((p) => (
            <Form.TagPicker.Item key={p.id} value={p.id} title={p.title} icon="icon.png" />
          ))}
        </Form.TagPicker>
      )}
      {projects.length > 0 && <Form.Description text={hint} />}
    </Form>
  );
}

export default function Command() {
  const [kind, setKind] = useState<CategoryKind>("stage");
  const [options, setOptions] = useState<TaxonomyOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function reload(currentKind: CategoryKind) {
    setIsLoading(true);
    setOptions(await TAXONOMIES[currentKind].get());
    setIsLoading(false);
  }

  useEffect(() => {
    void reload(kind);
  }, [kind]);

  async function createOption(name: string) {
    const hasCustomOrder = options.some((option) => option.order !== undefined);
    const maxOrder = Math.max(0, ...options.map((option) => option.order ?? 0));

    const option: TaxonomyOption = {
      id: slugify(name),
      name,
      ...(hasCustomOrder ? { order: maxOrder + 1 } : {}),
    };

    if (options.some((o) => o.id === option.id)) {
      await showToast({ style: Toast.Style.Failure, title: t.tagNameExists });
      return;
    }

    const next = [...options, option];
    await TAXONOMIES[kind].save(next);
    setOptions(next);
    await showToast({ style: Toast.Style.Success, title: t.created });
  }

  async function editOption(id: string, name: string, color?: Color) {
    const existing = options.find((o) => o.id === id);
    const next = options.map((o) => {
      if (o.id !== id) return o;
      return kind === "stage" ? { ...o, name, color } : { ...o, name };
    });
    await TAXONOMIES[kind].save(next);
    setOptions(next);
    if (kind === "role" && existing && existing.name !== name) {
      await renameRoleEverywhere(existing.name, name);
    }
    await showToast({ style: Toast.Style.Success, title: t.infoUpdated });
  }

  // 删除前告诉用户有多少项目 / 曲目在用，免得以为只是删掉一个空选项。
  async function usageMessage(option: TaxonomyOption): Promise<string | undefined> {
    if (kind === "role") {
      const count = await countRoleUsage(option.name);
      return count > 0 ? t.deleteRoleInUse.replace("{count}", String(count)) : undefined;
    }
    const store = await getAllProjectMetadata();
    const count = loadProjectsSafely().filter((p) => hasTag(store[p.id], kind, option.id)).length;
    return count > 0 ? t.deleteTagInUse.replace("{count}", String(count)) : undefined;
  }

  async function deleteOption(option: TaxonomyOption) {
    const confirmed = await confirmAlert({
      icon: { source: Icon.Trash, tintColor: Color.Red },
      title: `${t.delete} “${option.name}”?`,
      message: await usageMessage(option),
      primaryAction: { title: t.delete, style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) {
      return;
    }

    const next = options.filter((o) => o.id !== option.id);
    await TAXONOMIES[kind].save(next);
    setOptions(next);
    if (kind === "role") {
      await deleteRoleEverywhere(option.name);
    } else if (kind === "stage") {
      await removeStageEverywhere(option.id);
    } else if (kind === "genre") {
      await removeGenreEverywhere(option.id);
    }
    await showToast({ style: Toast.Style.Success, title: t.deleted });
  }

  // 恢复默认：写回默认种子，并清掉项目上指向已不存在选项的引用（Role 按名字，Stage/Genre 按 id）。
  async function resetOptions() {
    const confirmed = await confirmAlert({
      icon: { source: Icon.ArrowCounterClockwise, tintColor: Color.Red },
      title: `${t.resetToDefaults}?`,
      message: t.resetToDefaultsHint,
      primaryAction: { title: t.resetToDefaults, style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const previous = options;
    await TAXONOMIES[kind].reset();
    const next = await TAXONOMIES[kind].get();
    setOptions(next);

    for (const old of previous) {
      if (kind === "role") {
        if (!next.some((o) => o.name === old.name)) await deleteRoleEverywhere(old.name);
      } else if (!next.some((o) => o.id === old.id)) {
        if (kind === "stage") await removeStageEverywhere(old.id);
        else await removeGenreEverywhere(old.id);
      }
    }
    await showToast({ style: Toast.Style.Success, title: t.resetToDefaults });
  }

  // 重新排序并把 order 写成 1..N 持久化。
  async function reorder(from: number, to: number) {
    const next = [...options];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    const ordered = next.map((o, index) => ({ ...o, order: index + 1 }));
    await TAXONOMIES[kind].save(ordered);
    setOptions(ordered);
  }

  const createAction = (
    <Action.Push
      title={t.create}
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<CategoryForm title={t.create} onSubmit={createOption} />}
    />
  );

  const resetAction = (
    <Action
      title={t.resetToDefaults}
      icon={Icon.ArrowCounterClockwise}
      style={Action.Style.Destructive}
      onAction={resetOptions}
    />
  );

  const assignAction = (option: TaxonomyOption) =>
    kind === "role" ? null : (
      <Action.Push
        title={t.assignToProjects}
        icon={Icon.Folder}
        target={<AssignProjectsForm kind={kind} option={option} />}
      />
    );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={SEARCH_PLACEHOLDERS[kind]}
      searchBarAccessory={
        <List.Dropdown tooltip={t.tag} value={kind} onChange={(value) => setKind(value as CategoryKind)}>
          <List.Dropdown.Item title={t.stage} value="stage" />
          <List.Dropdown.Item title={t.genre} value="genre" />
          <List.Dropdown.Item title={t.role} value="role" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title={t.noCategories}
        icon={Icon.Tag}
        actions={
          <ActionPanel>
            {createAction}
            {resetAction}
          </ActionPanel>
        }
      />

      {options.map((option, index) => (
        <List.Item
          key={option.id}
          title={option.name}
          icon={kind === "stage" ? { source: Icon.Circle, tintColor: option.color ?? Color.SecondaryText } : Icon.Tag}
          actions={
            <ActionPanel>
              <Action.Push
                title={t.edit}
                icon={Icon.Pencil}
                shortcut={Keyboard.Shortcut.Common.Edit}
                target={
                  <CategoryForm
                    title={t.edit}
                    currentName={option.name}
                    showColor={kind === "stage"}
                    currentColor={option.color}
                    onSubmit={(name, color) => editOption(option.id, name, color)}
                  />
                }
              />
              {createAction}
              {assignAction(option)}
              <ActionPanel.Section>
                {index > 0 && (
                  <Action
                    title={t.moveToTop}
                    icon={Icon.ArrowUpCircle}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                    onAction={() => reorder(index, 0)}
                  />
                )}
                {index > 0 && (
                  <Action
                    title={t.moveUp}
                    icon={Icon.ArrowUp}
                    shortcut={Keyboard.Shortcut.Common.MoveUp}
                    onAction={() => reorder(index, index - 1)}
                  />
                )}
                {index < options.length - 1 && (
                  <Action
                    title={t.moveDown}
                    icon={Icon.ArrowDown}
                    shortcut={Keyboard.Shortcut.Common.MoveDown}
                    onAction={() => reorder(index, index + 1)}
                  />
                )}
                {index < options.length - 1 && (
                  <Action
                    title={t.moveToBottom}
                    icon={Icon.ArrowDownCircle}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
                    onAction={() => reorder(index, options.length - 1)}
                  />
                )}
              </ActionPanel.Section>
              <Action
                title={t.delete}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => deleteOption(option)}
              />
              {resetAction}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
