import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { InstalledApp } from "../utils/types";
import { setUserSparkleFeed } from "../utils/user-sparkle-feeds";
import { checkSparkle } from "../utils/sources/sparkle";

interface Props {
  app: InstalledApp;
  onDone: () => void;
}

interface TestResult {
  ok: boolean;
  message: string;
}

export default function SparkleFeedForm({ app, onDone }: Props) {
  const { pop } = useNavigation();
  const [url, setUrl] = useState(app.sparkleFeedUrl ?? "");
  const [urlError, setUrlError] = useState<string | undefined>();
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<TestResult | null>(null);

  function validate(v: string): boolean {
    const trimmed = v.trim();
    if (!trimmed) {
      setUrlError("URL is required");
      return false;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      setUrlError("Must start with http:// or https://");
      return false;
    }
    setUrlError(undefined);
    return true;
  }

  async function testFeed() {
    if (!validate(url)) return;
    setTesting(true);
    setTest(null);
    try {
      // Build a temporary app object with the candidate feed URL and ask
      // checkSparkle to do the real fetch+parse+compare. This guarantees the
      // test path matches exactly what the scanner will do later.
      const probe: InstalledApp = { ...app, sparkleFeedUrl: url.trim() };
      const result = await checkSparkle(probe);
      if (!result) {
        setTest({
          ok: false,
          message:
            "Fetched the URL but couldn't parse any version info. Wrong format or empty feed?",
        });
      } else {
        const verdict = result.hasUpdate
          ? `✓ Update available — latest ${result.latestVersion} (you have ${app.version})`
          : `✓ Feed works — you're on the latest (${result.latestVersion})`;
        setTest({ ok: true, message: verdict });
      }
    } catch (e) {
      setTest({
        ok: false,
        message: `Fetch failed: ${String(e).slice(0, 200)}`,
      });
    } finally {
      setTesting(false);
    }
  }

  async function submit() {
    if (!validate(url)) return;
    await setUserSparkleFeed(app.bundleId, url.trim());
    await showToast({
      style: Toast.Style.Success,
      title: `Saved feed for ${app.name}`,
      message: "Future scans will use this URL.",
    });
    onDone();
    pop();
  }

  return (
    <Form
      isLoading={testing}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Feed URL"
            icon={Icon.Stars}
            onSubmit={submit}
          />
          <Action
            title="Test Feed"
            icon={Icon.MagnifyingGlass}
            onAction={testFeed}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
          />
          {app.sparkleFeedUrl && (
            <Action
              title="Reset to Auto-detected URL"
              icon={Icon.ArrowCounterClockwise}
              onAction={() => {
                setUrl(app.sparkleFeedUrl!);
                setTest(null);
              }}
            />
          )}
          <Action title="Cancel" icon={Icon.XMarkCircle} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.Description
        title={app.name}
        text={`Bundle ID: ${app.bundleId}\nInstalled version: ${app.version}\n\nPaste the app's Sparkle appcast URL (you can usually find it on the project's GitHub page or in the app's docs). The mapping is saved per bundle ID and used on every future scan.`}
      />
      <Form.TextField
        id="feedUrl"
        title="Sparkle Feed URL"
        placeholder="https://example.com/appcast.xml"
        value={url}
        onChange={(v) => {
          setUrl(v);
          if (urlError) validate(v);
          if (test) setTest(null);
        }}
        error={urlError}
        info={
          app.sparkleFeedUrl
            ? `Auto-detected: ${app.sparkleFeedUrl}`
            : "No SUFeedURL in the app's Info.plist — manual wire-up needed."
        }
      />
      {test && (
        <Form.Description
          title={test.ok ? "Test passed" : "Test failed"}
          text={test.message}
        />
      )}
      <Form.Description text="Tip: press ⌘T to test the feed before saving." />
    </Form>
  );
}
