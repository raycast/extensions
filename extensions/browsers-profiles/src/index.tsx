import { ActionPanel, List, Icon, Action, closeMainWindow, getPreferenceValues } from "@raycast/api";

import { getFirefoxProfiles } from "./lib/firefox";
import { getChromiumProfiles } from "./lib/chromium";
import { launchBrowser } from "./lib/browsers";

export default function Command() {
  const preferences = getPreferenceValues();
  const enabledBrowsers = preferences["browsers.filter"].split(",");

  const chromiumProfiles = getChromiumProfiles(enabledBrowsers);
  const firefoxProfiles = getFirefoxProfiles(enabledBrowsers);

  const browsers = [...chromiumProfiles, ...firefoxProfiles];

  return (
    <List>
      {browsers.map((browser, index) => (
        <List.Section key={`browser-section-${index}`} title={browser.name}>
          {browser.profiles.map((profile, pindex) => (
            <List.Item
              key={`browser-profile-${pindex}`}
              icon={{ source: `icons/${profile.icon}` }}
              title={profile.label}
              accessories={[{ text: "Launch this profile", icon: Icon.Globe }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Open Browser"
                    onAction={async () => {
                      launchBrowser(profile.type, profile.app, profile.path);
                      await closeMainWindow({ clearRootSearch: true });
                    }}
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
