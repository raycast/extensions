import { ActionPanel, List, Icon, Action, closeMainWindow, getPreferenceValues } from "@raycast/api";

import { getFirefoxProfiles } from "./lib/firefox";
import { getChromiumProfiles } from "./lib/chromium";
import { launchBrowser } from "./lib/browsers";

export default function Command() {
  const preferences = getPreferenceValues();
  const chromiumProfiles = getChromiumProfiles(preferences);
  const firefoxProfiles = getFirefoxProfiles(preferences);

  const browsers = [...chromiumProfiles, ...firefoxProfiles];

  return (
    <List>
      {browsers.map((browser, index) => (
        <List.Section key={`browser-section-${index}`} title={browser.name}>
          {browser.profiles.map((profile, pindex) => (
            <List.Item
              key={`firefox-profile-${pindex}`}
              icon={{ source: `icons/${profile.icon}` }}
              title={profile.name}
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
