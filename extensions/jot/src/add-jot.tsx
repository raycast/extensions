import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  LaunchProps,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise, useForm, usePromise } from "@raycast/utils";
import { useRef } from "react";
import { addJot, canAttachImages, findCli, listJots } from "./lib/cli";
import { GetJotView } from "./lib/get-jot";
import { parseTags, sectionsOf } from "./lib/parse";

interface Values {
  text: string;
  tags: string;
  section: string;
  newSection: string;
  pin: boolean;
  images: string[];
  clipboardImage: boolean;
}

const NEW_SECTION = "__new__";
const IMAGE_FILE = /\.(png|jpe?g|gif|webp|heic|heif|tiff?|bmp)$/i;

/** The copied image, if the clipboard holds one (Raycast saves pasted image data to a file). */
async function clipboardImage(): Promise<string | undefined> {
  const { file } = await Clipboard.read();
  const path = file ? decodeURI(file.replace(/^file:\/\//, "")) : undefined;
  return path && IMAGE_FILE.test(path) ? path : undefined;
}

/**
 * The form. `onAdded` set: it was pushed from Search Jots, so go back there after adding.
 * Drafts are kept only when this is the command's root view (a Raycast rule).
 */
export function AddJotForm({
  onAdded,
  initialText,
  draft,
}: {
  onAdded?: () => void;
  initialText?: string;
  draft?: Partial<Values>;
}) {
  const { pop } = useNavigation();
  const another = useRef(false);
  const { data: sections = [] } = useCachedPromise(async () => sectionsOf(await listJots("", true)), []);
  const { data: richAdd } = usePromise(canAttachImages, []);
  const { data: copied } = usePromise(clipboardImage, []);

  const { handleSubmit, itemProps, reset, focus, values, setValidationError } = useForm<Values>({
    initialValues: {
      text: initialText ?? draft?.text ?? "",
      tags: draft?.tags ?? "",
      section: draft?.section ?? "",
      newSection: "",
      pin: false,
      images: [],
      clipboardImage: false,
    },
    async onSubmit(v) {
      const section = v.section === NEW_SECTION ? v.newSection.trim() : v.section;
      if (v.section === NEW_SECTION && !section) {
        setValidationError("newSection", "Name the new section");
        return;
      }
      const images = [...(v.images ?? []), ...(v.clipboardImage && copied ? [copied] : [])];
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: images.length ? "Saving with images…" : "Saving…",
      });
      try {
        await addJot({ text: v.text.trim(), tags: parseTags(v.tags), section, pin: v.pin, images });
        onAdded?.();
        const where = section ? ` to ${section}` : "";
        if (another.current) {
          another.current = false;
          toast.style = Toast.Style.Success;
          toast.title = `Jotted${where}`;
          toast.message = "Write the next one";
          reset({ ...v, text: "", images: [], clipboardImage: false, pin: false });
          focus("text");
        } else if (onAdded) {
          toast.style = Toast.Style.Success;
          toast.title = `Jotted${where}`;
          pop();
        } else {
          await toast.hide();
          await showHUD(`✓ Jotted${where}`, { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
        }
      } catch (error) {
        await toast.hide();
        await showFailureToast(error, { title: "Couldn't save the jot" });
      }
    },
    validation: {
      text: (value) => (value?.trim() ? undefined : "Write something first"),
      images: (paths) => {
        const bad = (paths ?? []).find((p) => !IMAGE_FILE.test(p));
        return bad ? `${bad.split("/").pop()} is not an image` : undefined;
      },
    },
  });

  return (
    <Form
      navigationTitle="New Jot"
      enableDrafts={!onAdded}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Jot" icon={Icon.Check} onSubmit={handleSubmit} />
          <Action.SubmitForm
            title="Save and Write Another"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
            onSubmit={(v: Values) => {
              another.current = true;
              return handleSubmit(v);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Jot"
        placeholder="What's on your mind? The first line becomes the title."
        enableMarkdown
        autoFocus
        {...itemProps.text}
      />
      <Form.Dropdown title="Section" {...itemProps.section}>
        <Form.Dropdown.Item title="Inbox" value="" icon={Icon.Tray} />
        {sections.length ? (
          <Form.Dropdown.Section>
            {sections.map((s) => (
              <Form.Dropdown.Item key={s} title={s} value={s} icon={Icon.Folder} />
            ))}
          </Form.Dropdown.Section>
        ) : null}
        <Form.Dropdown.Item title="New Section…" value={NEW_SECTION} icon={Icon.NewFolder} />
      </Form.Dropdown>
      {values.section === NEW_SECTION ? (
        <Form.TextField title="New Section" placeholder="Work" autoFocus {...itemProps.newSection} />
      ) : null}
      <Form.TextField
        title="Tags"
        placeholder="idea, work"
        info="Separate tags with commas or spaces."
        {...itemProps.tags}
      />
      {richAdd ? (
        <>
          <Form.Separator />
          <Form.FilePicker
            title="Images"
            allowMultipleSelection
            canChooseDirectories={false}
            info="PNG, JPEG, GIF, WebP, HEIC or TIFF. Up to 10 images, 10 MB each."
            {...itemProps.images}
          />
          {copied ? (
            <Form.Checkbox
              label={`Attach the copied image (${copied.split("/").pop()})`}
              {...itemProps.clipboardImage}
            />
          ) : null}
          <Form.Checkbox label="Pin to the top of the inbox" {...itemProps.pin} />
        </>
      ) : richAdd === false ? (
        <Form.Description text="Update Jot to 2.0.1 or later to attach images and pin jots from here." />
      ) : null}
      <Form.Description text="⌘⏎ saves. ⌘⇧⏎ saves and clears the form for the next one." />
    </Form>
  );
}

export default function AddJot(props: LaunchProps<{ draftValues: Values }>) {
  if (!findCli()) return <GetJotView />;
  return <AddJotForm draft={props.draftValues} />;
}
