import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Folder } from "../types";
import { t } from "../utils/i18n";
import { prepareCustomFolderIcon } from "../utils/iconExtractor";
import {
  createFolder,
  findFirstAvailableSlot,
  getFolders,
  MAX_SHORTCUT_SLOTS,
} from "../utils/storage";

interface CreateFolderFormProps {
  onFolderCreated: () => void;
  defaultSlot?: number;
}

/**
 * Form component for creating a new folder.
 */
export function CreateFolderForm({
  onFolderCreated,
  defaultSlot,
}: CreateFolderFormProps) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [iconFiles, setIconFiles] = useState<string[]>([]);
  const [previewStyle, setPreviewStyle] = useState<"auto" | "plain">("auto");
  const [slot, setSlot] = useState<string>(
    defaultSlot ? String(defaultSlot) : "auto",
  );
  const [allFolders, setAllFolders] = useState<Folder[]>([]);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    async function loadExistingFolders() {
      const folders = await getFolders();
      setAllFolders(folders);
      if (!defaultSlot) {
        const firstEmpty = findFirstAvailableSlot(folders);
        setSlot(firstEmpty ? String(firstEmpty) : "none");
      }
    }
    loadExistingFolders();
  }, [defaultSlot]);

  async function handleSubmit() {
    if (!name.trim()) {
      setError(t.nameRequiredError);
      return;
    }

    try {
      let finalIcon = icon.trim();
      if (iconFiles.length > 0 && iconFiles[0]) {
        finalIcon = await prepareCustomFolderIcon(iconFiles[0]);
      }

      const preferredSlot =
        slot === "none"
          ? null
          : slot === "auto"
            ? undefined
            : parseInt(slot, 10);

      const newFolder = await createFolder(
        name,
        finalIcon,
        preferredSlot,
        previewStyle,
      );

      await showToast({
        style: Toast.Style.Success,
        title: t.folderCreatedTitle,
        message: t.folderCreatedMessage(newFolder.name, newFolder.slot),
      });
      onFolderCreated();
      pop();
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: t.errorTitle,
        message: t.saveFolderError,
      });
    }
  }

  // Show occupancy status for shortcut slots 1 to 5
  const slotOptions = [
    { value: "none", label: t.noSlot },
    ...Array.from({ length: MAX_SHORTCUT_SLOTS }, (_, idx) => {
      const slotNum = idx + 1;
      const occupyingFolder = allFolders.find((f) => f.slot === slotNum);
      return {
        value: String(slotNum),
        label: occupyingFolder
          ? t.slotOccupied(slotNum, occupyingFolder.name)
          : t.slotAvailable(slotNum),
      };
    }),
  ];

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t.createFolderSubmit}
            onSubmit={handleSubmit}
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
        onChange={setIconFiles}
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
        placeholder={t.folderIconEmojiPlaceholder}
        value={icon}
        info={t.folderIconEmojiInfo}
        onChange={setIcon}
      />

      <Form.Dropdown
        id="slot"
        title={t.shortcutSlot}
        value={slot === "auto" ? "none" : slot}
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
