import { ActionPanel, List, Icon, Action } from "@raycast/api";

import { getFirefoxProfiles } from "./lib/firefox";
import { getChromiumProfiles } from "./lib/chromium";
import { launchBrowser } from "./lib/browsers";

export default function Command() {
  const chromiumProfiles = getChromiumProfiles();
  const firefoxProfiles = getFirefoxProfiles();

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
                    onAction={() => {
                      launchBrowser(profile.type, profile.app, profile.path);
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
