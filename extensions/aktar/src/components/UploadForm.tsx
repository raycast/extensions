import { Action, ActionPanel, Form, Icon, popToRoot, useNavigation } from "@raycast/api";
import { useCachedPromise, useForm } from "@raycast/utils";
import { listDestinations } from "../api/client";
import { destinationIcon } from "../lib/format";
import { onlyFiles, uploadPaths } from "../lib/upload";
import { showAktarFailure } from "../lib/errors";
import { DELETE_AFTER_OPTIONS, parseExpiry, preferredExpiry } from "../lib/expiry";

type Values = {
  files: string[];
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
  const defaultDestination = destinationId ?? destinations?.find((destination) => destination.isDefault)?.id;

  const { handleSubmit, itemProps, setValidationError } = useForm<Values>({
    initialValues: {
      files: initialFiles ?? [],
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
      const expires = parseExpiry(values.deleteAfter);
      if (folder && expires) {
        setValidationError("deleteAfter", "Not available with a folder. Clear Folder or pick Never.");
        return false;
      }
      setValidationError("deleteAfter", undefined);
      const uploads = await uploadPaths(files, {
        destinationId: values.destinationId || undefined,
        // An empty folder means "use the destination's path template".
        prefix: folder ? folder : undefined,
        expires,
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
      <Form.Dropdown
        id="destinationId"
        title="Destination"
        // Rendered only once destinations load, so the default one is preselected.
        key={defaultDestination ?? "loading"}
        defaultValue={defaultDestination}
      >
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
        info="Leave empty to name files with the destination's path template, like a drop on the menu bar. With a folder (or / for the bucket root), files keep their own names and are numbered instead of overwritten when a name is taken. Can't be combined with Delete After."
        {...itemProps.folder}
      />
      <Form.Dropdown
        title="Delete After"
        info="Aktar deletes the files from your bucket after this time. Only works without a folder, and needs Aktar 0.5.0 or later with auto-delete set up for the destination (Delete after in Aktar's menu bar)."
        {...itemProps.deleteAfter}
      >
        {DELETE_AFTER_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.days} value={String(option.days)} title={option.title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
