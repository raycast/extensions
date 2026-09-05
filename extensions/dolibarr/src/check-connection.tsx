import { Action, ActionPanel, Color, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { checkConnection, type Diagnosis } from "./api/status";
import { getConfig } from "./preferences";

const HINTS: Record<Exclude<Diagnosis, { ok: true }>["reason"], string> = {
  network:
    "The address cannot be reached. Check the spelling, whether the instance is running, and whether you are on the right network.",
  "not-dolibarr":
    "No Dolibarr API answers at this address. Enter only the instance address, for example `https://dolibarr.example.org` — the extension appends `/api/index.php` itself.",
  unauthorized:
    "The address is correct, but the API key was rejected. You can find it in Dolibarr on your own user card under the API key tab.",
  http: "The API responded unexpectedly. The instance may be in maintenance mode.",
};

function toMarkdown(diagnosis: Diagnosis, baseUrl: string): string {
  if (diagnosis.ok) {
    return [
      "# Connected",
      `The extension reached **Dolibarr ${diagnosis.version}** and the API key was accepted.`,
      "",
      `Address checked: \`${baseUrl}/status\``,
    ].join("\n\n");
  }

  return [
    "# Connection failed",
    diagnosis.detail,
    HINTS[diagnosis.reason],
    "",
    `Address checked: \`${baseUrl}/status\``,
  ].join("\n\n");
}

export default function Command() {
  const { data, isLoading, revalidate, error } = usePromise(async () => {
    // Reading the preferences can itself fail when the URL is empty or malformed.
    const config = getConfig();
    return { diagnosis: await checkConnection(config), baseUrl: config.baseUrl };
  }, []);

  const markdown = error
    ? `# Preferences incomplete\n\n${error.message}\n\nEnter the Dolibarr URL and API key in the extension preferences.`
    : data
      ? toMarkdown(data.diagnosis, data.baseUrl)
      : "# Checking connection …";

  const ok = data?.diagnosis.ok === true;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Check Connection"
      markdown={markdown}
      metadata={
        data ? (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item
                text={ok ? "Connected" : "Not connected"}
                color={ok ? Color.Green : Color.Red}
              />
            </Detail.Metadata.TagList>
            {data.diagnosis.ok ? (
              <Detail.Metadata.Label title="Dolibarr version" text={data.diagnosis.version} />
            ) : (
              <Detail.Metadata.Label title="Reason" text={data.diagnosis.reason} />
            )}
          </Detail.Metadata>
        ) : null
      }
      actions={
        <ActionPanel>
          <Action title="Check Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
          <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
