import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import fsSync from "fs";
import { useState } from "react";
import { Folder } from "../types";
import { t } from "../utils/i18n";
import {
  isCustomIconFile,
  prepareCustomFolderIcon,
} from "../utils/iconExtractor";
import { getFolders, MAX_SHORTCUT_SLOTS, updateFolder } from "../utils/storage";

interface EditFolderFormProps {
  folder: Folder;
  onUpdated: () => unknown | Promise<unknown>;
}

/**
 * Form component for editing folder settings.
 */
export function EditFolderForm({ folder, onUpdated }: EditFolderFormProps) {
  const { pop } = useNavigation();
  const hasExistingImageIcon = isCustomIconFile(folder.icon);
  const isAbsoluteExistingFile = Boolean(
    hasExistingImageIcon &&
    folder.icon?.startsWith("/") &&
    fsSync.existsSync(folder.icon),
  );

  const [name, setName] = useState(folder.name);
  const [icon, setIcon] = useState(
    hasExistingImageIcon || folder.icon === "📁" ? "" : folder.icon || "",
  );
  const [iconFiles, setIconFiles] = useState<string[]>(
    isAbsoluteExistingFile && folder.icon ? [folder.icon] : [],
  );
  const [keepBuiltinAsset, setKeepBuiltinAsset] = useState<boolean>(
    Boolean(hasExistingImageIcon && !folder.icon?.startsWith("/")),
  );
  const [previewStyle, setPreviewStyle] = useState<"auto" | "plain">(
    folder.previewStyle || "auto",
  );
  const [slot, setSlot] = useState(folder.slot ? String(folder.slot) : "none");
  const [error, setError] = useState<string | undefined>();

  const { data: allFolders = [], isLoading } = usePromise(getFolders);

  async function handleSubmit() {
    if (!name.trim()) {
      setError(t.nameRequiredError);
      return;
    }

    try {
      const assignedSlot = slot === "none" ? null : parseInt(slot, 10);

      let finalIcon = "";
      if (iconFiles.length > 0 && iconFiles[0]) {
        finalIcon = await prepareCustomFolderIcon(iconFiles[0]);
      } else if (icon.trim()) {
        finalIcon = icon.trim();
      } else if (keepBuiltinAsset && folder.icon) {
        finalIcon = folder.icon;
      }

      await updateFolder(folder.id, {
        name,
        icon: finalIcon,
        slot: assignedSlot,
        previewStyle,
      });

      await showToast({
        style: Toast.Style.Success,
        title: t.folderUpdatedTitle,
        message: t.folderUpdatedMessage(name),
      });
      await onUpdated();
      pop();
    } catch (err) {
      await showFailureToast(err, { title: t.errorTitle });
    }
  }

  function handleResetIcon() {
    setIconFiles([]);
    setIcon("");
    setKeepBuiltinAsset(false);
    setPreviewStyle("auto");
    showToast({
      style: Toast.Style.Success,
      title: t.resetToDefaultIcon,
    });
  }

  // Show occupancy status for shortcut slots 1 to 5
  const slotOptions = [
    { value: "none", label: t.noSlot },
    ...Array.from({ length: MAX_SHORTCUT_SLOTS }, (_, idx) => {
      const slotNum = idx + 1;
      const occupyingFolder = allFolders.find((f) => f.slot === slotNum);
      let label = t.slotAvailable(slotNum);
      if (occupyingFolder) {
        label =
          occupyingFolder.id === folder.id
            ? t.slotCurrent(slotNum)
            : t.slotOccupied(slotNum, occupyingFolder.name);
      }
      return {
        value: String(slotNum),
        label,
      };
    }),
  ];

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t.saveSettingsSubmit}
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
          <Action
            title={t.resetToDefaultIcon}
            icon={Icon.RotateAntiClockwise}
            onAction={handleResetIcon}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title={t.folderName}
        placeholder={t.folderNamePlaceholder}
        value={name}
        error={error}
        onChange={(val) => {
          setName(val);
          if (error) setError(undefined);
        }}
      />

      <Form.FilePicker
        id="iconFile"
        title={t.folderIcon}
        canChooseFiles
        canChooseDirectories={false}
        allowMultipleSelection={false}
        value={iconFiles}
        onChange={(files) => {
          setIconFiles(files);
          if (files.length > 0) {
            setKeepBuiltinAsset(false);
          }
        }}
      />
      <Form.Description text={t.folderIconDesc} />

      <Form.Dropdown
        id="previewStyle"
        title={t.folderPreviewStyle}
        value={previewStyle}
        onChange={(val) => setPreviewStyle(val as "auto" | "plain")}
      >
        <Form.Dropdown.Item
          value="auto"
          title={t.previewStyleAuto}
          icon={Icon.Eye}
        />
        <Form.Dropdown.Item
          value="plain"
          title={t.previewStylePlain}
          icon={Icon.Folder}
        />
      </Form.Dropdown>
      <Form.Description text={t.folderPreviewStyleDesc} />

      <Form.TextField
        id="icon"
        title={t.folderIconEmoji}
        value={icon}
        placeholder={t.folderIconEmojiPlaceholder}
        info={t.folderIconEmojiInfo}
        onChange={(val) => {
          setIcon(val);
          if (val.trim()) {
            setKeepBuiltinAsset(false);
          }
        }}
      />

      <Form.Dropdown
        id="slot"
        title={t.shortcutSlot}
        value={slot}
        onChange={setSlot}
      >
        {slotOptions.map((opt) => (
          <Form.Dropdown.Item
            key={opt.value}
            value={opt.value}
            title={opt.label}
          />
        ))}
      </Form.Dropdown>
      <Form.Description text={t.slotDesc} />
    </Form>
  );
}
