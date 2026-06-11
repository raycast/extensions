import { JSX, useState } from "react";
import {
  Form,
  ActionPanel,
  Action,
  Icon,
  open,
  Detail,
  useNavigation,
  showToast,
  Toast,
  environment,
} from "@raycast/api";
import { existsSync } from "fs";
import { join } from "path";
import { authorize } from "../auth";
import { saveClientId } from "../client-id";

const GIF_DEMO_NAME = "frameio_raycast_demo.gif";
const GIF_SETUP_NAME = "frameio_raycast_setup.gif";
const demoGifPath = join(environment.assetsPath, "gif", GIF_DEMO_NAME);
const setupGifPath = join(environment.assetsPath, "gif", GIF_SETUP_NAME);
const hasPluginDemoGif = existsSync(demoGifPath);
const hasSetupGif = existsSync(setupGifPath);

const FEATURES = `## What you can do

- **Browse Frame.io** — Navigate workspaces, projects, folders, and files with rich metadata and quick actions.
- **Search Frame.io** — Search your entire account in real time, with filters by type.
- **Open Last Frame.io Folder** — Jump straight back to the last folder you browsed, in the browser.
- **Recent Frame.io Uploads** — See the latest files uploaded to your workspace.`;

const STEPS = `## Steps

1. Open [Adobe Developer Console](https://developer.adobe.com/console)
2. **Add Project** → **Add API** → **Frame.io API**
3. **User Authentication** → **OAuth** → **OAuth Single Page App**
4. Configure the Redirect URIs:
   - **Default redirect URI**: \`https://raycast.com/redirect?packageName=frameio\`
   - **Redirect URI pattern**: \`https://raycast\\.com/redirect.*\`
5. Copy the **Client ID** and paste it on the next screen
6. Sign in with your Adobe account and allow the extension to access your account

> This extension is not affiliated with Frame.io or Adobe. It is open source on [GitHub](https://github.com/phileas/frameio_raycast_extension). Contributions and issue reports are welcome.`;

interface SetupGuideProps {
  onComplete?: () => void;
}

function SetupClientIdForm({ onComplete }: SetupGuideProps): JSX.Element {
  const { pop } = useNavigation();
  const [clientId, setClientId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = clientId.trim();
    if (!trimmed) {
      await showToast({ style: Toast.Style.Failure, title: "Client ID is required" });
      return;
    }
    setIsSaving(true);
    try {
      await saveClientId(trimmed);
      await authorize();
      pop();
      pop();
      onComplete?.();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save Client ID",
        message: String(error),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Form
      isLoading={isSaving}
      navigationTitle="Enter Client ID"
      actions={
        <ActionPanel>
          <Action title="Save Client ID" icon={Icon.Check} onAction={handleSave} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Almost done"
        text="Paste the Client ID you copied from the Adobe Developer Console. You will be asked to sign in with Adobe right after."
      />
      <Form.TextField
        id="clientId"
        title="Adobe Developer Client ID"
        placeholder="Paste your Client ID here"
        value={clientId}
        onChange={setClientId}
      />
    </Form>
  );
}

function SetupTutorial({ onComplete }: SetupGuideProps): JSX.Element {
  const { push } = useNavigation();

  const setupGifBlock = hasSetupGif ? `![Setup — get your Client ID](${setupGifPath})\n\n` : "";

  return (
    <Detail
      navigationTitle="Setup tutorial"
      markdown={`# One-time setup\n\nAdobe requires a personal **Client ID** so this extension can access your Frame.io account via OAuth. The walkthrough below takes about **3 minutes**.\n\n${setupGifBlock}${STEPS}`}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Continue"
              icon={Icon.ArrowRight}
              onAction={() => push(<SetupClientIdForm onComplete={onComplete} />)}
            />
            <Action
              title="Open Adobe Developer Console"
              icon={Icon.Globe}
              onAction={() => open("https://developer.adobe.com/console")}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function SetupGuide({ onComplete }: SetupGuideProps): JSX.Element {
  const { push } = useNavigation();

  const pluginDemoBlock = hasPluginDemoGif ? `![Plugin demo](${demoGifPath})\n\n` : "";

  return (
    <Detail
      markdown={`# Welcome to this *(unofficial)* Frame.io Raycast extension\n\nBrowse and search your Frame.io v4 account without leaving Raycast.\n\n${pluginDemoBlock}${FEATURES}\n\n---\n\n**First-time setup takes about 3 minutes** — you only need to create a free Adobe Developer Client ID once.`}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Continue"
              icon={Icon.ArrowRight}
              onAction={() => push(<SetupTutorial onComplete={onComplete} />)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
