import { Action, ActionPanel, Form, Icon, getApplications } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useNavigation } from "@raycast/api";

export interface ProfileSettings {
  fastMode: boolean;
  stepDelay: number;
  browser?: string;
  browserProfile?: string;
}

interface Props extends ProfileSettings {
  onSave: (settings: ProfileSettings) => void;
}

const BROWSER_RE = /safari|chrome|chromium|brave|edge|firefox|arc|vivaldi|opera|orion|zen|dia/i;

export default function SettingsForm({ fastMode, stepDelay, browser, browserProfile, onSave }: Props) {
  const { pop } = useNavigation();
  const { data: browsers = [], isLoading } = useCachedPromise(async () => {
    const apps = await getApplications();
    return apps
      .filter((a) => BROWSER_RE.test(a.name))
      .map((a) => a.name)
      .sort((a, b) => a.localeCompare(b));
  });

  function handleSubmit(values: { fastMode: boolean; stepDelay: string; browser: string; browserProfile: string }) {
    const parsed = Number(values.stepDelay);
    onSave({
      fastMode: values.fastMode,
      stepDelay: Number.isFinite(parsed) && parsed > 0 ? parsed : 0,
      browser: values.browser || undefined,
      browserProfile: values.browserProfile.trim() || undefined,
    });
    pop();
  }

  return (
    <Form
      navigationTitle="Activation Settings"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="browser" title="Open URLs In" defaultValue={browser ?? ""}>
        <Form.Dropdown.Item value="" title="Default browser" icon={Icon.Globe} />
        {browsers.map((name) => (
          <Form.Dropdown.Item key={name} value={name} title={name} icon={Icon.Globe} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="browserProfile"
        title="Browser Profile / Workspace"
        placeholder="e.g. Default, Profile 1, Work"
        defaultValue={browserProfile}
        info="Chromium browsers only (Chrome, Brave, Edge). Opens the profile's URLs in this profile/workspace. Find the value in chrome://version → Profile Path."
      />
      <Form.Separator />
      <Form.Checkbox
        id="fastMode"
        label="Fast mode"
        defaultValue={fastMode}
        info="Open apps and URLs in parallel. Commands always run sequentially."
      />
      <Form.TextField
        id="stepDelay"
        title="Delay between commands (seconds)"
        placeholder="0"
        defaultValue={String(stepDelay || "")}
        info="Pause after each command — useful when a step needs the previous one to settle."
      />
    </Form>
  );
}
