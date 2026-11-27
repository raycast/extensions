import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  getSelectedFinderItems,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { displayName } from "../lib/format";
import { addProfile, listProfiles } from "../lib/pritunl";
import { Profile } from "../lib/types";

type Source = "link" | "file";

const LINK = /^(pritunl|https?):\/\/\S+$/i;
const PROFILE_FILE = /\.(tar|zip|ovpn|conf)$/i;

interface Props {
  /** Called with the profiles the import added, after the form closes. */
  onAdded: (added: Profile[]) => void;
}

/**
 * Starts from what the user most likely means: a profile link they just copied, or a
 * profile file they have selected in Finder.
 */
async function guessSource(): Promise<{ source: Source; link?: string; file?: string } | undefined> {
  try {
    const file = (await getSelectedFinderItems()).find((item) => PROFILE_FILE.test(item.path));
    if (file) return { source: "file", file: file.path };
  } catch {
    // Finder isn't frontmost or nothing is selected.
  }
  const text = (await Clipboard.readText())?.trim();
  if (text && LINK.test(text)) return { source: "link", link: text };
  return undefined;
}

function summary(added: Profile[]): string {
  if (added.length === 1) return `Added ${displayName(added[0])}`;
  if (added.length > 1) return `Added ${added.length} profiles`;
  return "No new profiles";
}

export function AddProfile({ onAdded }: Props) {
  const { pop } = useNavigation();
  const [source, setSource] = useState<Source>("link");
  const [link, setLink] = useState("");
  const [file, setFile] = useState<string[]>([]);
  const [linkError, setLinkError] = useState<string>();
  const [fileError, setFileError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  // The guess arrives a moment after the form opens, and mustn't replace anything already entered.
  const touched = useRef(false);

  useEffect(() => {
    guessSource().then((guess) => {
      if (!guess || touched.current) return;
      setSource(guess.source);
      if (guess.link) setLink(guess.link);
      if (guess.file) setFile([guess.file]);
    });
  }, []);

  async function submit() {
    const target = source === "link" ? link.trim() : file[0];
    if (source === "link" && !LINK.test(target ?? "")) {
      setLinkError("Paste a pritunl:// or https:// profile link");
      return;
    }
    if (source === "file" && !(target && PROFILE_FILE.test(target))) {
      setFileError("Choose a .tar, .zip, .ovpn or .conf file");
      return;
    }

    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Importing profile" });
    try {
      const before = new Set((await listProfiles()).map((profile) => profile.id));
      await addProfile(target as string);
      const added = (await listProfiles()).filter((profile) => !before.has(profile.id));

      toast.style = added.length > 0 ? Toast.Style.Success : Toast.Style.Failure;
      toast.title = summary(added);
      if (added.length === 0) toast.message = "Those profiles might already be here";
      pop();
      onAdded(added);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't import profile";
      toast.message = error instanceof Error ? error.message : String(error);
      setIsLoading(false);
    }
  }

  return (
    <Form
      navigationTitle="Add Profile"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Profile" icon={Icon.Plus} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="source"
        title="Import From"
        value={source}
        onChange={(value) => {
          touched.current = true;
          setSource(value as Source);
        }}
      >
        <Form.Dropdown.Item value="link" title="Profile Link" icon={Icon.Link} />
        <Form.Dropdown.Item value="file" title="Profile File" icon={Icon.Document} />
      </Form.Dropdown>
      {source === "link" ? (
        <Form.TextField
          id="link"
          title="Profile Link"
          placeholder="pritunl://…"
          info="Copy it from your Pritunl user profile page. It works like a password, so only use your own."
          value={link}
          error={linkError}
          onChange={(value) => {
            touched.current = true;
            setLink(value);
            setLinkError(undefined);
          }}
        />
      ) : (
        <Form.FilePicker
          id="file"
          title="Profile File"
          allowMultipleSelection={false}
          canChooseDirectories={false}
          info="Select profile file in tar, zip, ovpn or conf format."
          value={file}
          error={fileError}
          onChange={(value) => {
            touched.current = true;
            setFile(value);
            setFileError(undefined);
          }}
        />
      )}
    </Form>
  );
}
