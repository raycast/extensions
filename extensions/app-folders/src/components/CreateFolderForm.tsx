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
import { t } from "../utils/i18n";
import { prepareCustomFolderIcon } from "../utils/iconExtractor";
import {
  createFolder,
  findFirstAvailableSlot,
  getFolders,
  MAX_SHORTCUT_SLOTS,
} from "../utils/storage";

interface CreateFolderFormProps {
  onFolderCreated: () => unknown | Promise<unknown>;
  defaultSlot?: number;
}

interface CreateFolderValues {
  name: string;
  icon: string;
  iconFile: string[];
  previewStyle: string;
  slot: string;
}

/**
 * Form component for creating a new folder using useForm and FormValidation.
 */
export function CreateFolderForm({
  onFolderCreated,
  defaultSlot,
}: CreateFolderFormProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps, setValue } = useForm<CreateFolderValues>({
    async onSubmit(values) {
      try {
        let finalIcon = values.icon.trim();
        if (values.iconFile.length > 0 && values.iconFile[0]) {
          finalIcon = await prepareCustomFolderIcon(values.iconFile[0]);
        }

        const preferredSlot =
          values.slot === "none" ? null : parseInt(values.slot, 10);
        const resolvedPreviewStyle =
          values.previewStyle === "plain" ? "plain" : "auto";

        const newFolder = await createFolder(
          values.name,
          finalIcon,
          preferredSlot,
          resolvedPreviewStyle,
        );

        await showToast({
          style: Toast.Style.Success,
          title: t.folderCreatedTitle,
          message: t.folderCreatedMessage(newFolder.name, newFolder.slot),
        });
        await onFolderCreated();
        pop();
      } catch (err) {
        await showFailureToast(err, { title: t.errorTitle });
      }
    },
    validation: {
      name: FormValidation.Required,
    },
    initialValues: {
      name: "",
      icon: "",
      iconFile: [],
      previewStyle: "auto",
      slot: defaultSlot ? String(defaultSlot) : "none",
    },
  });

  const { data: allFolders = [], isLoading } = usePromise(getFolders, [], {
    onData: (folders) => {
      if (!defaultSlot) {
        const firstEmpty = findFirstAvailableSlot(folders);
        if (firstEmpty) {
          setValue("slot", String(firstEmpty));
        }
      }
    },
  });

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
      isLoading={isLoading}
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
