import {
  Action,
  ActionPanel,
  closeMainWindow,
  getApplications,
  Icon,
  Keyboard,
  launchCommand,
  LaunchProps,
  LaunchType,
  List,
  open,
  popToRoot,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useLocalStorage, usePromise } from "@raycast/utils";
import { Browser, resolveBrowsers, STORAGE_KEY, StoredBrowser } from "./lib/browsers";
import { upsertRule } from "./lib/config";
import { apexDomain, apexMatcher, hostMatcher } from "./lib/domains";
import { Rule } from "./lib/entry";

export default function Choose(props: LaunchProps<{ arguments: Arguments.Choose }>) {
  const url = parseUrl(props.arguments.url);
  const { data: apps, isLoading: loadingApps } = usePromise(getApplications);
  const { value: stored, isLoading: loadingStored } = useLocalStorage<StoredBrowser[]>(STORAGE_KEY, []);
  const isLoading = loadingApps || loadingStored;
  const browsers = apps && stored ? resolveBrowsers(stored, apps) : [];

  if (!url) {
    return (
      <List>
        <List.EmptyView icon={Icon.ExclamationMark} title="Invalid URL" description={props.arguments.url} />
      </List>
    );
  }

  const apex = apexDomain(url);
  const manage = (
    <Action
      title="Manage Browsers"
      icon={Icon.Gear}
      shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
      onAction={() => launchCommand({ name: "browsers", type: LaunchType.UserInitiated })}
    />
  );

  return (
    <List isLoading={isLoading} navigationTitle={url.hostname} searchBarPlaceholder="Filter browsers…">
      {!isLoading && browsers.length === 0 && (
        <List.EmptyView
          icon={Icon.Globe}
          title="No browsers in the chooser"
          description="Add some with Manage Browsers"
          actions={<ActionPanel>{manage}</ActionPanel>}
        />
      )}
      <List.Section title={url.href}>
        {browsers.map((browser) => (
          <List.Item
            key={browser.app.path}
            icon={{ fileIcon: browser.app.path }}
            title={browser.app.name}
            actions={
              <ActionPanel>
                <Action title="Open Once" icon={Icon.Globe} onAction={() => openIn(browser, url)} />
                {url.hostname && (
                  <Action
                    title={`Remember ${url.hostname}`}
                    icon={Icon.Pin}
                    onAction={() =>
                      remember({ match: hostMatcher(url), browser: browser.spec }, url.hostname, browser, url)
                    }
                  />
                )}
                {apex && (
                  <Action
                    title={`Remember ${apex} and Subdomains`}
                    icon={Icon.Pin}
                    shortcut={{ modifiers: ["opt"], key: "enter" }}
                    onAction={() =>
                      remember({ match: apexMatcher(apex), browser: browser.spec }, `*.${apex}`, browser, url)
                    }
                  />
                )}
                <Action.CopyToClipboard title="Copy URL" content={url.href} shortcut={Keyboard.Shortcut.Common.Copy} />
                {manage}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

/** Accepts a full URL, as the glue sends it, or a bare host typed by hand, which gets https:// prepended. */
function parseUrl(raw: string): URL | null {
  const text = raw.trim();
  if (!text) return null;
  return tryUrl(text) ?? tryUrl(`https://${text}`);
}

function tryUrl(text: string): URL | null {
  if (!/^[a-z][a-z0-9+.-]*:/i.test(text)) return null;
  try {
    return new URL(text);
  } catch {
    return null;
  }
}

async function openIn(browser: Browser, url: URL): Promise<void> {
  try {
    await open(url.href, browser.app);
    await closeMainWindow({ clearRootSearch: true });
    await popToRoot();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Could not open in ${browser.app.name}`,
      message: String(error),
    });
  }
}

async function remember(rule: Rule, label: string, browser: Browser, url: URL): Promise<void> {
  try {
    upsertRule(rule);
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Could not save rule", message: String(error) });
    return;
  }
  try {
    await open(url.href, browser.app);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Rule saved, but could not open in ${browser.app.name}`,
      message: String(error),
    });
    return;
  }
  await showHUD(`${label} → ${browser.app.name}`);
  await popToRoot();
}
