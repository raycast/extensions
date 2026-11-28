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
import { useState } from "react";
import { usePromise } from "@raycast/utils";
import fs from "node:fs";
import path from "node:path";
import {
  addPreviousBounceName,
  assertMetadataWritable,
  getProjectMetadata,
  renameProjectMetadata,
  saveProjectMetadata,
} from "@/core/metadata/project-metadata";
import { showFailure } from "@/core/ui/shared/toast";
import { strings } from "@/strings";
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
import { daw } from "@/daws";
import { labels } from "@/daws/labels";
import { optionKeywords } from "@/core/ui/shared/search-keywords";
import { entryNameConflict, isSameEntry } from "@/core/ui/shared/project-entry-name";

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

  const [stageId, setStageId] = useState("none");
  const [genreIds, setGenreIds] = useState<string[]>([]);
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const [originalCollectionIds, setOriginalCollectionIds] = useState<string[]>([]);
  const [role, setRole] = useState(currentRole ?? "none");

  // 标签、合集、项目元数据一次读完：用 usePromise 拿到加载状态和失败路径，不再自己拼 useState + useEffect。
  // Role 只在合集里出现，其他入口不读。
  const { data, isLoading } = usePromise(
    async (projectId: string, collection: string | undefined) => {
      const [stages, genres, collections, metadata] = await Promise.all([
        stageTaxonomy.get(),
        genreTaxonomy.get(),
        collectionTaxonomy.get(),
        getProjectMetadata(projectId),
      ]);
      const roles = collection ? await roleTaxonomy.get() : [];
      return { stages, genres, collections, metadata, roles };
    },
    [project.id, collectionId],
    {
      // 读到的值填进表单：这几个字段之后由用户自己改，所以只在读到数据时写一次。
      onData: (loaded) => {
        setStageId(loaded.metadata.stageId ?? "none");
        setGenreIds(loaded.metadata.genreIds);
        setCollectionIds(loaded.metadata.collectionIds);
        setOriginalCollectionIds(loaded.metadata.collectionIds);
      },
      failureToastOptions: { title: strings.loadInfoFailed },
    },
  );

  // 保存的标签、合集读完前不许提交：那时 stageId / genreIds / collectionIds 还是空默认值，
  // 一提交就会把项目原有的标签清掉，合集成员关系也会被当成「移出」。
  const loaded = data !== undefined;
  // Role 选项读完前不渲染下拉：选项为空时 Raycast 会退回 None 并触发 onChange，把当前角色覆盖掉。
  const rolesLoaded = data !== undefined;
  const stageOptions = data?.stages ?? [];
  const genreOptions = data?.genres ?? [];
  const collectionOptions = data?.collections ?? [];
  const roleOptions = data?.roles ?? [];
  async function handleSubmit() {
    if (!loaded) return;

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
      await showToast({ style: Toast.Style.Success, title: strings.noChanges });
      pop();
      return;
    }

    // 保存会写元数据、各合集的轨号和角色（改名时还要迁移）：先确认都能写，再动文件夹或弹确认框。
    try {
      await assertMetadataWritable();
      await assertOrdersWritable();
      await assertRolesWritable();
    } catch (error) {
      await showFailure(strings.storageUnreadable, error);
      return;
    }

    // 移出了合集：独立确认（点明会清掉那些合集里的排序与角色），放在改名确认之前，
    // 避免改完名/写完盘后用户才在这一步取消、留下半成品。
    if (removedCollections.length > 0) {
      const names = removedCollections.map((id) => collectionOptions.find((c) => c.id === id)?.name ?? id).join(", ");
      const confirmed = await confirmAlert({
        icon: { source: Icon.Trash, tintColor: Color.Red },
        title: strings.removeCollectionsConfirmTitle,
        message: strings.removeCollectionsConfirmHint.replace("{names}", names),
        primaryAction: { title: strings.removeFromCollection, style: Alert.ActionStyle.Destructive },
      });
      if (!confirmed) return;
    }

    let targetId = project.id;
    let docRenameResult: DocRenameResult | null = null;
    let rename: ProjectRename | undefined;

    if (nameChanged) {
      if (trimmedName.includes("/") || trimmedName.includes(":")) {
        await showToast({ style: Toast.Style.Failure, title: strings.invalidName });
        return;
      }

      const dir = path.dirname(project.folderPath);
      const newPath = path.join(dir, daw.entryNameFor(trimmedName, project.kind));

      // 两种入口名都查：包和文件夹换算出同一个 id 时，两个项目会共用元数据，列表里只剩一个。
      // 目标就是项目自己（只改大小写、不区分大小写的卷）时放过。
      const conflict = entryNameConflict(
        dir,
        trimmedName,
        daw.entryNameFor,
        (target) => fs.existsSync(target),
        (target) => isSameEntry(target, project.folderPath),
      );
      if (conflict !== null) {
        await showToast({ style: Toast.Style.Failure, title: strings.nameExists });
        return;
      }

      // 改名后笔记/歌词文件会与别的项目撞名（如 Song?A 与 Song？A）：拦下，免得两个项目共用一份笔记。
      const docTakenBy = docNameTakenBy(trimmedName, project.title);
      if (docTakenBy.length > 0) {
        await showToast({ style: Toast.Style.Failure, title: strings.docNameTaken, message: docTakenBy.join(", ") });
        return;
      }

      // 改名前预检笔记/歌词的目标文件是否已被占用，在确认框里写明后果，而不是改完才报。
      const docConflicts = docRenameConflicts(project.title, trimmedName);
      const hasDocConflicts = docConflicts.length > 0;
      const confirmed = await confirmAlert({
        icon: { source: Icon.Warning, tintColor: Color.Yellow },
        title: strings.renameConfirmTitle,
        message: hasDocConflicts
          ? `${labels.renameConfirmMessage}\n\n${strings.docConflictWarning.replace("{files}", docConflicts.join(", "))}`
          : labels.renameConfirmMessage,
        primaryAction: {
          title: hasDocConflicts ? strings.renameAnyway : strings.rename,
          style: hasDocConflicts ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
        },
      });

      if (!confirmed) {
        return;
      }

      try {
        fs.renameSync(project.folderPath, newPath);
      } catch (error) {
        await showFailure(strings.renameProjectFailed, error);
        return;
      }

      try {
        await renameProjectMetadata(project.id, trimmedName);
        // 改名前用旧名字导出的 bounce 继续归这个项目；改名之后再用旧名字导出的不算。
        await addPreviousBounceName(trimmedName, project.id, Date.now());
        // 合集里的轨号/角色也以项目 id 为键，一并迁移，否则改名后曲目会掉进 Unsorted、角色丢失。
        await renameProjectInAllOrders(project.id, trimmedName);
        await renameProjectInAllRoles(project.id, trimmedName);
      } catch (error) {
        // 预检之后仍写入失败：文件夹已改名，不往回改。下次加载列表时，Finder 同步会按 inode 认出这次改名，
        // 把没迁完的数据和文档补齐（每一步都能重复执行）；同步成功前不会更新项目清单，所以每次加载都会重试。
        onSaved({ oldId: project.id, newId: trimmedName, folderPath: newPath });
        await showFailure(strings.renameProjectFailed, error);
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
      await showToast({ style: Toast.Style.Failure, title: strings.docRenameSkipped, message: kinds });
    } else {
      await showToast({ style: Toast.Style.Success, title: strings.infoUpdated });
    }

    pop();
  }

  return (
    <Form
      navigationTitle={`${strings.editInfo} — ${project.title}`}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {loaded && <Action.SubmitForm title={strings.save} icon={Icon.Check} onSubmit={handleSubmit} />}
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title={strings.name} placeholder={project.title} value={name} onChange={setName} />
      {alteredDocChars(name.trim()).length > 0 && (
        <Form.Description
          text={strings.docNameHint
            .replace("{file}", docFileBaseName(name.trim()))
            .replace("{chars}", alteredDocChars(name.trim()).join(" "))}
        />
      )}
      <Form.Dropdown id="stage" title={strings.stage} value={stageId} onChange={setStageId}>
        <Form.Dropdown.Item value="none" title={strings.none} icon={Icon.Circle} />
        {stageOptions.map((option) => (
          <Form.Dropdown.Item
            key={option.id}
            value={option.id}
            title={option.name}
            keywords={optionKeywords(option)}
            icon={option.color ? { source: Icon.Circle, tintColor: option.color } : Icon.Circle}
          />
        ))}
      </Form.Dropdown>
      <Form.TagPicker id="genre" title={strings.genre} value={genreIds} onChange={setGenreIds}>
        {genreOptions.map((option) => (
          <Form.TagPicker.Item key={option.id} value={option.id} title={option.name} />
        ))}
      </Form.TagPicker>
      <Form.TagPicker id="collection" title={strings.collection} value={collectionIds} onChange={setCollectionIds}>
        {collectionOptions.map((option) => (
          <Form.TagPicker.Item key={option.id} value={option.id} title={option.name} />
        ))}
      </Form.TagPicker>
      {originalCollectionIds.some((id) => !collectionIds.includes(id)) && (
        <Form.Description text={strings.removeCollectionsFormHint} />
      )}
      {collectionId && rolesLoaded && (
        <Form.Dropdown id="role" title={strings.role} value={role} onChange={setRole}>
          <Form.Dropdown.Item value="none" title={strings.none} />
          {roleOptions.map((option) => (
            <Form.Dropdown.Item
              key={option.id}
              value={option.name}
              title={option.name}
              keywords={optionKeywords(option)}
            />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}
