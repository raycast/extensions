import { Action, ActionPanel, Detail, Toast, showToast, useNavigation } from "@raycast/api";
import { completeAuth, startAuth } from "../functions/lastfm";
import { useAuthState } from "../hooks/useAuthState";

interface Props {
  apikey: string;
  apiSecret: string;
  onConnected: () => void;
}

const MARKDOWN_NONE = `# Connect to Last.fm

Love and unlove tracks right from Raycast — no password required.

Last.fm uses a secure web authorization flow. You approve access in your browser, then return here to finish.

---

**Step 1 —** Click **Open Last.fm Auth** below. Your browser will open Last.fm's authorization page.

**Step 2 —** On that page, click **Allow access**.

**Step 3 —** Come back here and click **Complete Connection**.
`;

const MARKDOWN_PENDING = `# Authorize in Your Browser

You're on **Step 2**. Switch to your browser and click **Allow access** on the Last.fm page that opened.

Once you've approved access, come back here and click **Complete Connection** below.

---

If the browser didn't open, use **Reopen Last.fm Auth** to try again.
`;

const MARKDOWN_CONNECTED = `# Connected ✓

Your Last.fm account is linked. You can now love and unlove tracks from **Now Playing** and the **Menu Bar Player**.
`;

export function ConnectLastFm({ apikey, apiSecret, onConnected }: Props) {
  const { pop } = useNavigation();
  const { authState, setAuthState } = useAuthState();

  const markdown =
    authState === "connected" ? MARKDOWN_CONNECTED : authState === "pending" ? MARKDOWN_PENDING : MARKDOWN_NONE;

  async function handleOpenAuth() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Opening Last.fm…" });
    try {
      await startAuth(apikey, apiSecret);
      setAuthState("pending");
      toast.style = Toast.Style.Success;
      toast.title = "Authorize in your browser";
      toast.message = "Come back and click 'Complete Connection' when done.";
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to open Last.fm";
      toast.message = (err as Error).message;
    }
  }

  async function handleComplete() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Completing connection…" });
    try {
      await completeAuth(apikey, apiSecret);
      setAuthState("connected");
      onConnected();
      toast.style = Toast.Style.Success;
      toast.title = "Connected to Last.fm ✓";
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Connection failed";
      toast.message = (err as Error).message;
    }
  }

  return (
    <Detail
      markdown={markdown}
      isLoading={authState === null}
      actions={
        <ActionPanel>
          {authState === "none" && <Action title="Open Last.fm Auth" onAction={handleOpenAuth} />}
          {authState === "pending" && (
            <>
              <Action title="Complete Connection" onAction={handleComplete} />
              <Action title="Reopen Last.fm Auth" onAction={handleOpenAuth} />
            </>
          )}
          {authState === "connected" && <Action title="Done" onAction={pop} />}
        </ActionPanel>
      }
    />
  );
}
