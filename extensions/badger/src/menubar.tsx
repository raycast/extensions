import { Cache, Icon, Keyboard, MenuBarExtra, open, openExtensionPreferences } from "@raycast/api";
import { useEffect, useState } from "react";
import { promises as fs } from "node:fs";
import useStorage from "./utils/storage.ts";
import { BadgerApplication } from "./utils/apps.ts";
import useScripts from "./utils/scripts.ts";
import KeyEquivalent = Keyboard.KeyEquivalent;
import useExtension from "./utils/extension.ts";
import showMenuBarError from "./utils/permission.ts";

const cache = new Cache();

function Command() {
  const cachedResults = cache.get("apps");
  let cachedApps = [];
  if (cachedResults) {
    cachedApps = JSON.parse(cachedResults).filter((appItem: BadgerApplication | null) => appItem);
  }

  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<BadgerApplication[]>(cachedApps);
  const { getApps } = useStorage();
  const { getCount } = useScripts();
  const { launch, getPreferences } = useExtension();
  const preferences = getPreferences();

  useEffect(() => {
    async function getCounts() {
      const enabledApps = await getApps(true);
      const results: { [key: string]: BadgerApplication } = {};

      await Promise.all(
        enabledApps.map(async (app) => {
          try {
            await fs.access(app.path);
            const output = await getCount(app);
            const count = output.length ? parseInt(output, 10) : 0;
            results[app.name] = {
              ...app,
              count: Number.isNaN(count) ? 0 : count,
              attn: output === "•",
            };
          } catch (error) {
            await showMenuBarError(error);
          }
        }),
      );

      let sortedApps: BadgerApplication[] = [];
      if (Object.keys(results).length) {
        sortedApps = enabledApps.map((app) => results[app.name]);
      }
      cache.set("apps", JSON.stringify(sortedApps));
      setApps(sortedApps);
      setLoading(false);
    }
    getCounts();
  }, []);

  let total = 0;
  let attn = false;
  apps.forEach((app) => {
    if (app.attn) attn = preferences.attn;
    else total += app.count;
  });

  let title;
  if (preferences.total) {
    if (preferences.attn && attn && total) title = `${total} ${preferences.attnDot}`;
    else if (total) title = `${total}`;
    else if (preferences.attn && attn) title = `${preferences.attnDot}`;
  }

  return (
    <MenuBarExtra
      isLoading={loading}
      title={title}
      icon={{
        source: Icon.Bell,
        tintColor: total || (preferences.attn && attn) ? preferences.activeColor : preferences.color,
      }}
    >
      <MenuBarExtra.Section>
        {apps.map((app, index) => {
          const count = app.count ? `(${app.count})` : "";
          return (
            <MenuBarExtra.Item
              key={index}
              title={app.name}
              subtitle={preferences.attn && app.attn ? `(${preferences.attnDot})` : count}
              icon={{ fileIcon: app.path }}
              shortcut={index + 1 < 10 ? { modifiers: ["cmd"], key: `${index + 1}` as KeyEquivalent } : undefined}
              onAction={() => open(app.path)}
            />
          );
        })}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Configure Badges"
          shortcut={{ modifiers: ["cmd"], key: "b" }}
          onAction={() => launch(apps.length ? "list" : "add")}
        />
        <MenuBarExtra.Item
          title="Configure Extension"
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={() => openExtensionPreferences()}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

export default Command;
