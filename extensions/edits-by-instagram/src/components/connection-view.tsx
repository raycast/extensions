import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  List,
  getPreferenceValues,
  openExtensionPreferences,
  Keyboard,
} from "@raycast/api";
import { useRef, useState } from "react";
import { usePromise } from "@raycast/utils";
import { DOWNLOAD_URL, findEdits, openEdits } from "../lib/application";
import { ConnectionError, parseConnectionConfig, redactConnectionSecrets, safeConnectionError } from "../lib/config";
import { discoverCapabilities, type CapabilitySnapshot } from "../lib/discovery";
import { getAvailability } from "../lib/projects";

const SETUP = `# Connect to Edits

1. Open Edits and complete sign-in inside the app.
2. Open **Settings → Automation** and enable **Automation Server**.
3. Copy the **Endpoint** and **Access token** into this extension's secure preferences.
4. Run **Check Connection**.

Only the local automation token is needed. Never enter your Instagram password.

This extension uses the Streamable HTTP and bearer-token configuration verified in Edits 454.0.0. If your app provides a different connection type, it is not supported yet.

Keep Edits running. After restarting it or regenerating its token, update preferences if needed and check the connection again.`;

function SchemaDetail({ value }: { value: unknown }) {
  // Prevent server-provided text from escaping a code fence or loading remote images.
  const json = JSON.stringify(value, null, 2).replace(/`/g, "\\u0060");
  return <Detail markdown={`\`\`\`json\n${json}\n\`\`\``} />;
}

export function ConnectionView({ inspect = false, autoConnect = true }: { inspect?: boolean; autoConnect?: boolean }) {
  const [connect, setConnect] = useState(autoConnect);
  const controller = useRef<AbortController | null>(null);
  const {
    data,
    isLoading: loading,
    revalidate,
  } = usePromise(
    async (shouldConnect: boolean) => {
      const signal = controller.current?.signal;
      let application;
      try {
        application = await findEdits();
        if (!application)
          throw new ConnectionError("Edits is not installed", "Download Edits for Mac and complete its setup.");
        const config = parseConnectionConfig(getPreferenceValues<Preferences>());
        let snapshot: CapabilitySnapshot | undefined;
        if (shouldConnect) {
          const result = await discoverCapabilities(config, signal);
          // Redact strings before serialization too, including credentials containing JSON escapes.
          snapshot = JSON.parse(
            redactConnectionSecrets(
              JSON.stringify(result, (_key, value) =>
                typeof value === "string" ? redactConnectionSecrets(value, config) : value,
              ),
              config,
            ),
          ) as CapabilitySnapshot;
        }
        return { application, snapshot, error: undefined };
      } catch (failure) {
        return { application, snapshot: undefined, error: safeConnectionError(failure) };
      }
    },
    [connect],
    { abortable: controller },
  );
  const application = data?.application;
  const snapshot = loading ? undefined : data?.snapshot;
  const error = loading ? undefined : data?.error;

  function refresh() {
    if (!connect) setConnect(true);
    else void revalidate();
  }

  const actions = (
    <ActionPanel>
      <Action title="Check Connection" icon={Icon.ArrowClockwise} onAction={() => refresh()} />
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      {application ? (
        <Action title="Open Edits" icon={Icon.AppWindow} onAction={() => openEdits(application)} />
      ) : (
        <Action.OpenInBrowser title="Download Edits" url={DOWNLOAD_URL} />
      )}
      <Action.Push title="Setup Instructions" icon={Icon.QuestionMarkCircle} target={<Detail markdown={SETUP} />} />
    </ActionPanel>
  );

  if (!inspect || !snapshot) {
    const available = snapshot && getAvailability(snapshot.tools);
    const markdown = snapshot
      ? `# Connection verified\n\nEdits responded at ${new Date(snapshot.checkedAt).toLocaleTimeString()}. This is a point-in-time check; the session is now closed.\n\n${snapshot.tools.length} tools, ${snapshot.resources.length} resources, and ${snapshot.resourceTemplates.length} resource templates discovered.${snapshot.resourceTemplatesSupported ? "" : " Resource-template enumeration is unsupported by this Edits server."}\n\n${available?.projects ? "**Search Projects** is available." : "Project browsing is unavailable or its schema has changed."}\n\nTools depend on the current Edits screen. Return to the home screen for all project organization actions. Run **Discover Capabilities** to inspect schemas.`
      : error
        ? `# ${error.title}\n\n${error.message}\n\n${SETUP}`
        : SETUP;
    return <Detail isLoading={loading} markdown={markdown} actions={actions} />;
  }

  const groups = [
    { title: "Tools", icon: Icon.Hammer, values: snapshot.tools },
    { title: "Resources", icon: Icon.Document, values: snapshot.resources },
    { title: "Resource Templates", icon: Icon.Code, values: snapshot.resourceTemplates },
  ];
  return (
    <List isLoading={loading} searchBarPlaceholder="Search discovered capabilities…">
      <List.Section title="Connection Snapshot" subtitle={new Date(snapshot.checkedAt).toLocaleTimeString()}>
        <List.Item
          title="Connection verified"
          subtitle="Refresh after changing screens in Edits"
          icon={Icon.CheckCircle}
          actions={actions}
        />
      </List.Section>
      {groups.map((group) => (
        <List.Section key={group.title} title={group.title} subtitle={String(group.values.length)}>
          {group.values.map((value, index) => (
            <List.Item
              key={`${value.name}-${index}`}
              title={value.name}
              subtitle={value.description}
              icon={group.icon}
              actions={
                <ActionPanel>
                  <Action.Push title="Inspect Schema" icon={Icon.Code} target={<SchemaDetail value={value} />} />
                  <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                  <Action
                    title="Refresh Capabilities"
                    icon={Icon.ArrowClockwise}
                    onAction={() => refresh()}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
