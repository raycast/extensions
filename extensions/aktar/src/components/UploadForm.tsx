import { Action, ActionPanel, Form, Icon, popToRoot, useNavigation } from "@raycast/api";
import { useCachedPromise, useForm } from "@raycast/utils";
import path from "node:path";
import { listDestinations } from "../api/client";
import { destinationIcon } from "../lib/format";
import { onlyFiles, uploadPaths } from "../lib/upload";
import { showAktarFailure } from "../lib/errors";
import { DELETE_AFTER_OPTIONS, parseExpiry, preferredExpiry } from "../lib/expiry";

/** The destination choice that leaves picking to Aktar's Use For rules. */
const AUTOMATIC = "automatic";

type Values = {
  files: string[];
  /** Optional new name for a single file; the extension is kept when left out. */
  name: string;
  destinationId: string;
  folder: string;
  /** Days as a string, "0" meaning never. */
  deleteAfter: string;
};

type Props = {
  /** Preselects this destination and folder, e.g. when opened from the bucket browser. */
  destinationId?: string;
  prefix?: string;
  initialFiles?: string[];
  /** Called after a successful upload; the form pops itself instead of closing Raycast. */
  onUploaded?: () => void;
};

export function UploadForm({ destinationId, prefix, initialFiles, onUploaded }: Props) {
  const { pop } = useNavigation();
  const { data: destinations, isLoading } = useCachedPromise(listDestinations, [], {
    onError: (error) => {
      showAktarFailure(error, "Couldn't load destinations");
    },
  });
  // Opened for a bucket, the form uploads there; otherwise Aktar picks by Use For.
  const defaultDestination = destinationId ?? (destinations ? AUTOMATIC : undefined);

  const { handleSubmit, itemProps, setValidationError, values } = useForm<Values>({
    initialValues: {
      files: initialFiles ?? [],
      name: "",
      // "/" is the bucket root with files keeping their names; empty means the path template.
      folder: prefix === undefined ? "" : prefix || "/",
      // Aktar can't auto-delete into a chosen folder, so a preset folder starts at Never.
      deleteAfter: String(prefix === undefined ? preferredExpiry() : 0),
    },
    validation: {
      files: (value) => (value && value.length > 0 ? undefined : "Pick at least one file"),
    },
    async onSubmit(values) {
      const { files } = await onlyFiles(values.files);
      if (files.length === 0) {
        await showAktarFailure(new Error("Folders can't be uploaded, only files."), "Nothing to upload");
        return false;
      }
      const folder = values.folder.trim();
      const automatic = values.destinationId === AUTOMATIC;
      if (folder && automatic) {
        setValidationError("folder", "Pick a destination instead of Automatic to upload into a folder.");
        return false;
      }
      setValidationError("folder", undefined);
      const expires = parseExpiry(values.deleteAfter);
      if (folder && expires) {
        setValidationError("deleteAfter", "Not available with a folder. Clear Folder or pick Never.");
        return false;
      }
      setValidationError("deleteAfter", undefined);
      const uploads = await uploadPaths(files, {
        // Automatic sends no destination, so Aktar's Use For rules (or its selected destination) decide.
        destinationId: automatic ? undefined : values.destinationId || undefined,
        // An empty folder means "use the destination's path template".
        prefix: folder ? folder : undefined,
        expires,
        filename: files.length === 1 ? uploadName(values.name, files[0]) : undefined,
      });
      if (uploads.length === 0) return false;
      if (onUploaded) {
        onUploaded();
        pop();
      } else {
        await popToRoot({ clearSearchBar: true });
      }
    },
  });

  const singleFile = values.files?.length === 1 ? path.basename(values.files[0]) : undefined;

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={prefix ? `Upload to ${prefix}` : "Upload File"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Upload" icon={Icon.Upload} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker title="Files" allowMultipleSelection canChooseDirectories={false} {...itemProps.files} />
      {singleFile && (
        <Form.TextField
          title="Name"
          placeholder={path.parse(singleFile).name}
          info="Optional. Uploads the file under this name instead. The file's extension is kept unless you type one. With the destination's path template, it becomes {filename}; in a folder, it's the file's name there."
          {...itemProps.name}
        />
      )}
      <Form.Dropdown
        id="destinationId"
        title="Destination"
        // Rendered only once destinations load, so the default one is preselected.
        key={defaultDestination ?? "loading"}
        defaultValue={defaultDestination}
        info="Automatic lets Aktar choose: each file goes to the destination whose Use For claims its type or extension, else to the one selected in Aktar. Use For needs Aktar for Mac 0.14.0 or Aktar for Windows 0.7.0; older versions use the selected destination."
      >
        <Form.Dropdown.Item value={AUTOMATIC} title="Automatic" icon={Icon.Wand} />
        {(destinations ?? []).map((destination) => (
          <Form.Dropdown.Item
            key={destination.id}
            value={destination.id}
            title={destination.isDefault ? `${destination.name} (Default)` : destination.name}
            icon={destinationIcon(destination)}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        title="Folder"
        placeholder="Optional, e.g. screenshots/2026"
        info="Leave empty to name files with the destination's path template, like a file dropped on Aktar. With a folder (or / for the bucket root), files keep their own names and are numbered instead of overwritten when a name is taken. Can't be combined with Delete After."
        {...itemProps.folder}
      />
      <Form.Dropdown
        title="Delete After"
        info="Aktar deletes the files from your bucket after this time. Only works without a folder, and needs Aktar 0.5.0 for Mac or 0.1.2 for Windows with auto-delete set up for the destination (Delete after in Aktar's menu bar or tray panel)."
        {...itemProps.deleteAfter}
      >
        {DELETE_AFTER_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.days} value={String(option.days)} title={option.title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

/**
 * The typed name with path separators removed, keeping the file's own
 * extension unless the name has one. Undefined when nothing was typed.
 */
function uploadName(typed: string, filePath: string) {
  const name = typed.replace(/[/\\]/g, "").trim();
  if (!name || /^\.+$/.test(name)) return undefined;
  return path.extname(name) ? name : `${name}${path.extname(filePath)}`;
}
