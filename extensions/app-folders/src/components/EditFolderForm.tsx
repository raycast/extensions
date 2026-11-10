import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import {
  FormValidation,
  showFailureToast,
  useForm,
  usePromise,
} from "@raycast/utils";
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

interface EditFolderValues {
  name: string;
  icon: string;
  iconFile: string[];
  previewStyle: string;
  slot: string;
}

/**
 * Form component for editing folder settings using useForm and FormValidation.
 */
export function EditFolderForm({ folder, onUpdated }: EditFolderFormProps) {
  const { pop } = useNavigation();
  const hasExistingImageIcon = isCustomIconFile(folder.icon);
  const isAbsoluteExistingFile = Boolean(
    hasExistingImageIcon &&
    folder.icon?.startsWith("/") &&
    fsSync.existsSync(folder.icon),
  );

  const [keepBuiltinAsset, setKeepBuiltinAsset] = useState<boolean>(
    Boolean(hasExistingImageIcon && !folder.icon?.startsWith("/")),
  );

  const { handleSubmit, itemProps, setValue } = useForm<EditFolderValues>({
    async onSubmit(values) {
      try {
        const assignedSlot =
          values.slot === "none" ? null : parseInt(values.slot, 10);
        const resolvedPreviewStyle =
          values.previewStyle === "plain" ? "plain" : "auto";

        let finalIcon = "";
        if (values.iconFile.length > 0 && values.iconFile[0]) {
          finalIcon = await prepareCustomFolderIcon(values.iconFile[0]);
        } else if (values.icon.trim()) {
          finalIcon = values.icon.trim();
        } else if (keepBuiltinAsset && folder.icon) {
          finalIcon = folder.icon;
        }

        await updateFolder(folder.id, {
          name: values.name,
          icon: finalIcon,
          slot: assignedSlot,
          previewStyle: resolvedPreviewStyle,
        });

        await showToast({
          style: Toast.Style.Success,
          title: t.folderUpdatedTitle,
          message: t.folderUpdatedMessage(values.name),
        });
        await onUpdated();
        pop();
      } catch (err) {
        await showFailureToast(err, { title: t.errorTitle });
      }
    },
    validation: {
      name: FormValidation.Required,
    },
    initialValues: {
      name: folder.name,
      icon:
        hasExistingImageIcon || folder.icon === "📁" ? "" : folder.icon || "",
      iconFile: isAbsoluteExistingFile && folder.icon ? [folder.icon] : [],
      previewStyle: folder.previewStyle || "auto",
      slot: folder.slot ? String(folder.slot) : "none",
    },
  });

  const { data: allFolders = [], isLoading } = usePromise(getFolders);

  function handleResetIcon() {
    setValue("iconFile", []);
    setValue("icon", "");
    setValue("previewStyle", "auto");
    setKeepBuiltinAsset(false);
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
        {...itemProps.name}
        title={t.folderName}
        placeholder={t.folderNamePlaceholder}
      />

      <Form.FilePicker
        {...itemProps.iconFile}
        title={t.folderIcon}
        canChooseFiles
        canChooseDirectories={false}
        allowMultipleSelection={false}
        onChange={(files) => {
          setValue("iconFile", files);
          if (files.length > 0) {
            setKeepBuiltinAsset(false);
          }
        }}
      />
      <Form.Description text={t.folderIconDesc} />

      <Form.Dropdown {...itemProps.previewStyle} title={t.folderPreviewStyle}>
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
        {...itemProps.icon}
        title={t.folderIconEmoji}
        placeholder={t.folderIconEmojiPlaceholder}
        info={t.folderIconEmojiInfo}
        onChange={(val) => {
          setValue("icon", val);
          if (val.trim()) {
            setKeepBuiltinAsset(false);
          }
        }}
      />

      <Form.Dropdown {...itemProps.slot} title={t.shortcutSlot}>
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
