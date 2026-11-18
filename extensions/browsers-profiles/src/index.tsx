import { ActionPanel, List, Icon, Action, closeMainWindow, getPreferenceValues, LaunchProps } from "@raycast/api";

import { getFirefoxProfiles } from "./lib/firefox";
import { getChromiumProfiles } from "./lib/chromium";
import { launchBrowser } from "./lib/browsers";
import { useEffect, useState } from "react";

export default function Command(props: LaunchProps<{ launchContext: { type: string; app: string; profile: string } }>) {
  const preferences = getPreferenceValues<Preferences.Index>();
  const enabledBrowsers = preferences["browsers.filter"].split(",");

  const chromiumProfiles = getChromiumProfiles(enabledBrowsers);
  const firefoxProfiles = getFirefoxProfiles(enabledBrowsers);

  const browsers = [...chromiumProfiles, ...firefoxProfiles];

  const [launched, setLaunched] = useState(false);
  useEffect(() => {
    (() => {
      if (!launched && props.launchContext) {
        const { type, app, profile } = props.launchContext;
        setLaunched(true);
        launchBrowser(type, app, profile);
        closeMainWindow({ clearRootSearch: true });
      }
    })();
  }, []);

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
                    icon={`icons/${profile.icon}`}
                    title="Open Browser"
                    onAction={async () => {
                      launchBrowser(profile.type, profile.app, profile.path);
                      await closeMainWindow({ clearRootSearch: true });
                    }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Deeplink"
                    content={`raycast://extensions/skydiver/browsers-profiles/index?context=${encodeURIComponent(JSON.stringify({ type: profile.type, app: profile.app, profile: profile.path }))}`}
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
