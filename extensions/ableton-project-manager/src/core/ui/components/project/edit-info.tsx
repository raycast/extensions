import {
  ActionPanel,
  Action,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import type { TaxonomyOption } from "@/core/metadata/taxonomy";
import { useEffect, useState } from "react";
import fs from "node:fs";
import path from "node:path";
import {
  assertMetadataWritable,
  getProjectMetadata,
  renameProjectMetadata,
  saveProjectMetadata,
} from "@/core/metadata/project-metadata";
import { showFailure } from "@/core/ui/toast";
import { getTranslations } from "@/i18n";
import { getSettings } from "@/settings";
import {
  alteredDocChars,
  docFileBaseName,
  docNameTakenBy,
  docRenameConflicts,
  renameDocFiles,
  type DocRenameResult,
} from "@/core/docs/docs";
import {
  assertOrdersWritable,
  getTrackMap,
  removeNumber,
  renameProjectInAllOrders,
  setTrackMap,
} from "@/core/metadata/collection-order";
import {
  assertRolesWritable,
  clearRole,
  getRoleMap,
  renameProjectInAllRoles,
  setRoleMap,
} from "@/core/metadata/collection-roles";
import { stageTaxonomy, genreTaxonomy, collectionTaxonomy, roleTaxonomy } from "@/core/metadata/taxonomies";
import type { Project } from "@/core/projects/types";

const settings = getSettings();
const t = getTranslations(settings.language);

/** 改名成功时回传给调用方，便于其刷新内存中以旧 id 为键的状态。 */
export type ProjectRename = { oldId: string; newId: string; folderPath: string };

// 顺序无关的 id 集合比较，用于判断表单是否有改动。
function sameIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

export function EditInfo({
  project,
  onSaved,
  collectionId,
  currentRole,
  onRoleChanged,
}: {
  project: Project;
  onSaved: (rename?: ProjectRename) => void;
  collectionId?: string;
  currentRole?: string;
  onRoleChanged?: (role: string | null, projectId: string) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState(project.title);

  const [stageOptions, setStageOptions] = useState<TaxonomyOption[]>([]);
  const [genreOptions, setGenreOptions] = useState<TaxonomyOption[]>([]);
  const [collectionOptions, setCollectionOptions] = useState<TaxonomyOption[]>([]);

  const [stageId, setStageId] = useState("none");
  const [genreIds, setGenreIds] = useState<string[]>([]);
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const [originalCollectionIds, setOriginalCollectionIds] = useState<string[]>([]);
  const [roleOptions, setRoleOptions] = useState<TaxonomyOption[]>([]);
  const [role, setRole] = useState(currentRole ?? "none");
  useEffect(() => {
    async function load() {
      const [stages, genres, collections, metadata] = await Promise.all([
        stageTaxonomy.get(),
        genreTaxonomy.get(),
        collectionTaxonomy.get(),
        getProjectMetadata(project.id),
      ]);

      setStageOptions(stages);
      setGenreOptions(genres);
      setCollectionOptions(collections);
      setStageId(metadata.stageId ?? "none");
      setGenreIds(metadata.genreIds);
      setCollectionIds(metadata.collectionIds);
      setOriginalCollectionIds(metadata.collectionIds);

      if (collectionId) {
        setRoleOptions(await roleTaxonomy.get());
        setRole(currentRole ?? "none");
      }
    }

    void load();
  }, [project.id, collectionId, currentRole]);
  async function handleSubmit() {
    const trimmedName = name.trim();
    const nameChanged = trimmedName !== "" && trimmedName !== project.title;

    // 读原始元数据：判断是否有改动、以及哪些合集被移除。
    const original = await getProjectMetadata(project.id);
    const nextStageId = stageId === "none" ? null : stageId;
    const nextRole = role === "none" ? null : role;
    const removedCollections = (original.collectionIds ?? []).filter((id) => !collectionIds.includes(id));

    const changed =
      nameChanged ||
      nextStageId !== (original.stageId ?? null) ||
      !sameIds(genreIds, original.genreIds ?? []) ||
      !sameIds(collectionIds, original.collectionIds ?? []) ||
      (collectionId !== undefined && nextRole !== (currentRole ?? null));

    if (!changed) {
      await showToast({ style: Toast.Style.Success, title: t.noChanges });
      pop();
      return;
    }

    // 保存会写元数据、各合集的轨号和角色（改名时还要迁移）：先确认都能写，再动文件夹或弹确认框。
    try {
      await assertMetadataWritable();
      await assertOrdersWritable();
      await assertRolesWritable();
    } catch (error) {
      await showFailure(t.storageUnreadable, error);
      return;
    }

    // 移出了合集：独立确认（点明会清掉那些合集里的排序与角色），放在改名确认之前，
    // 避免改完名/写完盘后用户才在这一步取消、留下半成品。
    if (removedCollections.length > 0) {
      const names = removedCollections.map((id) => collectionOptions.find((c) => c.id === id)?.name ?? id).join(", ");
      const confirmed = await confirmAlert({
        icon: { source: Icon.Trash, tintColor: Color.Red },
        title: t.removeCollectionsConfirmTitle,
        message: t.removeCollectionsConfirmHint.replace("{names}", names),
        primaryAction: { title: t.removeFromCollection, style: Alert.ActionStyle.Destructive },
      });
      if (!confirmed) return;
    }

    let targetId = project.id;
    let docRenameResult: DocRenameResult | null = null;
    let rename: ProjectRename | undefined;

    if (nameChanged) {
      if (trimmedName.includes("/") || trimmedName.includes(":")) {
        await showToast({ style: Toast.Style.Failure, title: t.invalidName });
        return;
      }

      const newPath = path.join(path.dirname(project.folderPath), trimmedName);

      // 目标路径已存在时，看它是不是项目自己（只改大小写、不区分大小写的卷）；是别的文件夹就拦下。
      let targetIsSelf = false;
      try {
        const target = fs.statSync(newPath);
        const self = fs.statSync(project.folderPath);
        targetIsSelf = target.ino === self.ino && target.dev === self.dev;
      } catch {
        // 目标不存在。
      }
      if (!targetIsSelf && fs.existsSync(newPath)) {
        await showToast({ style: Toast.Style.Failure, title: t.nameExists });
        return;
      }

      // 改名后笔记/歌词文件会与别的项目撞名（如 Song?A 与 Song？A）：拦下，免得两个项目共用一份笔记。
      const docTakenBy = docNameTakenBy(trimmedName, project.title);
      if (docTakenBy.length > 0) {
        await showToast({ style: Toast.Style.Failure, title: t.docNameTaken, message: docTakenBy.join(", ") });
        return;
      }

      // 改名前预检笔记/歌词的目标文件是否已被占用，在确认框里写明后果，而不是改完才报。
      const docConflicts = docRenameConflicts(project.title, trimmedName);
      const hasDocConflicts = docConflicts.length > 0;
      const confirmed = await confirmAlert({
        icon: { source: Icon.Warning, tintColor: Color.Yellow },
        title: t.renameConfirmTitle,
        message: hasDocConflicts
          ? `${t.renameConfirmMessage}\n\n${t.docConflictWarning.replace("{files}", docConflicts.join(", "))}`
          : t.renameConfirmMessage,
        primaryAction: {
          title: hasDocConflicts ? t.renameAnyway : t.rename,
          style: hasDocConflicts ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
        },
      });

      if (!confirmed) {
        return;
      }

      try {
        fs.renameSync(project.folderPath, newPath);
      } catch (error) {
        await showFailure(t.renameFailed, error);
        return;
      }

      try {
        await renameProjectMetadata(project.id, trimmedName);
        // 合集里的轨号/角色也以项目 id 为键，一并迁移，否则改名后曲目会掉进 Unsorted、角色丢失。
        await renameProjectInAllOrders(project.id, trimmedName);
        await renameProjectInAllRoles(project.id, trimmedName);
      } catch (error) {
        // 预检之后仍写入失败：文件夹已改名，不往回改。下次加载列表时，Finder 同步会按 inode 认出这次改名，
        // 把没迁完的数据和文档补齐（每一步都能重复执行）；同步成功前不会更新项目清单，所以每次加载都会重试。
        onSaved({ oldId: project.id, newId: trimmedName, folderPath: newPath });
        await showFailure(t.renameFailed, error);
        return;
        pop();
        return;
      }
      docRenameResult = renameDocFiles(project.title, trimmedName);
      targetId = trimmedName;
      rename = { oldId: project.id, newId: trimmedName, folderPath: newPath };
    }

    const metadata = await getProjectMetadata(targetId);
    // 被移出的合集：和 Remove from Tracklist 一样清掉本曲在那里的轨号和角色，
    // 免得日后再加回来时旧轨号"复活"、与别的曲目撞号。
    for (const id of removedCollections) {
      const trackMap = await getTrackMap(id);
      if (targetId in trackMap) await setTrackMap(id, removeNumber(trackMap, targetId));
      const roleMap = await getRoleMap(id);
      if (targetId in roleMap) await setRoleMap(id, clearRole(roleMap, targetId));
    }
    await saveProjectMetadata(targetId, {
      ...metadata,
      stageId: stageId === "none" ? null : stageId,
      genreIds,
      collectionIds,
    });

    if (collectionId && onRoleChanged && !removedCollections.includes(collectionId)) {
      if (nextRole !== (currentRole ?? null)) {
        await onRoleChanged(nextRole, targetId);
      }
    }

    onSaved(rename);

    if (docRenameResult && (docRenameResult.conflicts.length > 0 || docRenameResult.failures.length > 0)) {
      // 文档改名有冲突/失败：如实告知，而不是误报"已更新"。
      const kinds = [...docRenameResult.conflicts, ...docRenameResult.failures].join(", ");
      await showToast({ style: Toast.Style.Failure, title: t.docRenameSkipped, message: kinds });
    } else {
      await showToast({ style: Toast.Style.Success, title: t.infoUpdated });
    }

    pop();
  }

  return (
    <Form
      navigationTitle={`${t.editInfo} — ${project.title}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t.save} icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title={t.name} value={name} onChange={setName} />
      {alteredDocChars(name.trim()).length > 0 && (
        <Form.Description
          text={t.docNameHint
            .replace("{file}", docFileBaseName(name.trim()))
            .replace("{chars}", alteredDocChars(name.trim()).join(" "))}
        />
      )}
      <Form.Dropdown id="stage" title={t.stage} value={stageId} onChange={setStageId}>
        <Form.Dropdown.Item value="none" title={t.none} icon={Icon.Circle} />
        {stageOptions.map((option) => (
          <Form.Dropdown.Item
            key={option.id}
            value={option.id}
            title={option.name}
            icon={option.color ? { source: Icon.Circle, tintColor: option.color } : Icon.Circle}
          />
        ))}
      </Form.Dropdown>
      <Form.TagPicker id="genre" title={t.genre} value={genreIds} onChange={setGenreIds}>
        {genreOptions.map((option) => (
          <Form.TagPicker.Item key={option.id} value={option.id} title={option.name} />
        ))}
      </Form.TagPicker>
      <Form.TagPicker id="collection" title={t.collection} value={collectionIds} onChange={setCollectionIds}>
        {collectionOptions.map((option) => (
          <Form.TagPicker.Item key={option.id} value={option.id} title={option.name} />
        ))}
      </Form.TagPicker>
      {originalCollectionIds.some((id) => !collectionIds.includes(id)) && (
        <Form.Description text={t.removeCollectionsFormHint} />
      )}
      {collectionId && (
        <Form.Dropdown id="role" title={t.role} value={role} onChange={setRole}>
          <Form.Dropdown.Item value="none" title={t.none} />
          {roleOptions.map((option) => (
            <Form.Dropdown.Item
              key={option.id}
              value={option.name}
              title={option.name}
              keywords={option.name.includes("&") ? [option.name.replace(/&/g, "n")] : undefined}
            />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}
