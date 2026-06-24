import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Toast,
  getPreferenceValues,
  open,
  useNavigation,
  showToast,
} from "@raycast/api";
import { readFile, stat } from "node:fs/promises";
import { createFormPoof, type CreatePoofFormValues } from "./lib/form";
import {
  createDefaultsFromPreferences,
  type PoofPreferences,
} from "./lib/preferences";
import { ResultDetail } from "./result-detail";

const http = (input: string, init?: RequestInit) => fetch(input, init);

export default function Command() {
  const preferences = getPreferenceValues<PoofPreferences>();
  const { push } = useNavigation();

  async function onSubmit(values: CreatePoofFormValues) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating Poof",
    });
    try {
      const created = await createFormPoof(
        {
          http,
          clipboard: Clipboard,
          statPath: async (path) => {
            const s = await stat(path);
            return { isFile: s.isFile(), isDirectory: s.isDirectory() };
          },
          readFile: async (path) => new Uint8Array(await readFile(path)),
        },
        createDefaultsFromPreferences(preferences),
        values,
      );
      toast.style = Toast.Style.Success;
      toast.title = "Poof created";
      push(<ResultDetail created={created} />);
      if (preferences.openInBrowserAfterCreate) await open(created.link);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not create Poof";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Poof" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Text"
        placeholder="Paste something that should not stick around."
      />
      <Form.FilePicker
        id="files"
        title="File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
      />
      <Form.Dropdown id="ttl" title="TTL" defaultValue={preferences.defaultTtl}>
        <Form.Dropdown.Item value="60000" title="1 minute" />
        <Form.Dropdown.Item value="300000" title="5 minutes" />
        <Form.Dropdown.Item value="3600000" title="1 hour" />
        <Form.Dropdown.Item value="86400000" title="1 day" />
        <Form.Dropdown.Item value="604800000" title="7 days" />
        <Form.Dropdown.Item value="2592000000" title="30 days" />
        <Form.Dropdown.Item value="custom" title="Custom" />
      </Form.Dropdown>
      <Form.TextField
        id="ttlCustomAmount"
        title="Custom TTL Amount"
        placeholder="30"
      />
      <Form.Dropdown
        id="ttlCustomUnit"
        title="Custom TTL Unit"
        defaultValue="m"
      >
        <Form.Dropdown.Item value="m" title="Minutes" />
        <Form.Dropdown.Item value="h" title="Hours" />
        <Form.Dropdown.Item value="d" title="Days" />
      </Form.Dropdown>
      <Form.Dropdown
        id="reveals"
        title="Reveal Budget"
        defaultValue={preferences.defaultReveals}
      >
        <Form.Dropdown.Item value="1" title="1 Reveal" />
        <Form.Dropdown.Item value="3" title="3 Reveals" />
        <Form.Dropdown.Item value="10" title="10 Reveals" />
        <Form.Dropdown.Item value="-1" title="Unlimited until TTL" />
        <Form.Dropdown.Item value="custom" title="Custom" />
      </Form.Dropdown>
      <Form.TextField
        id="revealsCustomAmount"
        title="Custom Reveals"
        placeholder="7"
      />
      <Form.PasswordField id="pin" title="PIN or Password" />
      <Form.Checkbox id="secret" label="Treat as secret" />
      <Form.Checkbox id="maskedUrl" label="Share as masked URL" />
      <Form.Checkbox
        id="revealAnchored"
        label="Start the timer on first Reveal"
        defaultValue={preferences.defaultRevealAnchored}
      />
      <Form.Checkbox
        id="allowViewerDelete"
        label="Let the viewer delete it"
        defaultValue={preferences.defaultAllowViewerDelete}
      />
      <Form.Checkbox
        id="requireTurnstile"
        label="Require captcha on Reveal"
        defaultValue={preferences.defaultRequireTurnstile}
      />
      <Form.Checkbox
        id="showCountdown"
        label="Show recipient countdown"
        defaultValue
      />
    </Form>
  );
}
