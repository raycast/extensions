import { ActionPanel, Action, Icon, List, open, closeMainWindow, showToast, Toast } from "@raycast/api";
import { useState, useMemo, useCallback, useEffect } from "react";
import { readdirSync, existsSync } from "fs";
import { execFileSync } from "child_process";
import { join } from "path";
import { homedir } from "os";
import pokemon from "./pokemon.json";

interface Pokemon {
  name: string;
  gen: number;
}

const allPokemon: Pokemon[] = pokemon;

const customSpritesDir = join(homedir(), "Library", "Application Support", "deskpals", "CustomSprites");

function findAppSpritesDir(): string | null {
  // Check common locations for deskpals.app
  const candidates = [
    "/Applications/deskpals.app/Contents/Resources/Sprites",
    join(homedir(), "Applications", "deskpals.app", "Contents", "Resources", "Sprites"),
  ];
  // Also check Xcode DerivedData for dev builds
  const derivedDataDir = join(homedir(), "Library", "Developer", "Xcode", "DerivedData");
  if (existsSync(derivedDataDir)) {
    try {
      for (const entry of readdirSync(derivedDataDir)) {
        if (entry.startsWith("deskpals-")) {
          candidates.push(
            join(
              derivedDataDir,
              entry,
              "Build",
              "Products",
              "Debug",
              "deskpals.app",
              "Contents",
              "Resources",
              "Sprites",
            ),
          );
        }
      }
    } catch {
      // ignore
    }
  }
  for (const dir of candidates) {
    if (existsSync(dir)) return dir;
  }
  return null;
}

const appSpritesDir = findAppSpritesDir();

function discoverCustomSprites(): Pokemon[] {
  if (!existsSync(customSpritesDir)) return [];
  try {
    return readdirSync(customSpritesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(join(customSpritesDir, entry.name, "default_idle_8fps.gif")))
      .map((entry) => ({ name: entry.name.toLowerCase(), gen: -1 }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

function spriteIcon(p: Pokemon, shiny: boolean): string | undefined {
  if (p.gen === -1) {
    const path = join(customSpritesDir, p.name, "default_idle_8fps.gif");
    return existsSync(path) ? path : undefined;
  }
  if (!appSpritesDir) return undefined;
  const variant = shiny ? "shiny_idle_8fps.gif" : "default_idle_8fps.gif";
  const path = join(appSpritesDir, `gen${p.gen}`, p.name, variant);
  return existsSync(path) ? path : undefined;
}

function genLabel(gen: number): string {
  return gen === -1 ? "Custom" : `Gen ${gen}`;
}

function readActiveSprites(): Set<string> {
  try {
    const raw = execFileSync("plutil", [
      "-extract",
      "selectedPokemonList",
      "raw",
      "-o",
      "-",
      join(homedir(), "Library", "Preferences", "com.deskpals.app.plist"),
    ]);
    const json = Buffer.from(raw.toString().trim(), "base64").toString("utf-8");
    const list: { name: string; gen: number }[] = JSON.parse(json);
    return new Set(list.map((p) => `${p.name}:${p.gen}`));
  } catch {
    return new Set();
  }
}

type Filter = "all" | "active";

function displayName(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, " ");
}

export default function Command() {
  const [shiny, setShiny] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const customSprites = useMemo(() => discoverCustomSprites(), [refreshKey]);
  const activeSprites = useMemo(() => readActiveSprites(), [refreshKey]);

  // Poll active sprites so changes are picked up between Raycast opens
  useEffect(() => {
    const refresh = () => setRefreshKey((k) => k + 1);
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, []);

  const isActive = useCallback((p: Pokemon) => activeSprites.has(`${p.name}:${p.gen}`), [activeSprites]);

  async function selectSprite(p: Pokemon) {
    const url =
      p.gen === -1
        ? `deskpals://pokemon?name=${encodeURIComponent(p.name)}&gen=-1`
        : `deskpals://pokemon?name=${encodeURIComponent(p.name)}&gen=${p.gen}&shiny=${shiny}`;
    await closeMainWindow();
    await open(url);
    const label = p.gen === -1 ? displayName(p.name) : `${displayName(p.name)}${shiny ? " (Shiny)" : ""}`;
    await showToast({ style: Toast.Style.Success, title: `Selected ${label}` });
  }

  return (
    <List
      searchBarPlaceholder="Search sprites..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter"
          storeValue
          onChange={(value) => {
            const [s, f] = value.split(":");
            setShiny(s === "shiny");
            setFilter(f as Filter);
          }}
        >
          <List.Dropdown.Section title="Normal">
            <List.Dropdown.Item title="All Sprites" value="normal:all" icon={Icon.Circle} />
            <List.Dropdown.Item title="Currently Active" value="normal:active" icon={Icon.Check} />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Shiny">
            <List.Dropdown.Item title="All Sprites (Shiny)" value="shiny:all" icon={Icon.Star} />
            <List.Dropdown.Item title="Currently Active (Shiny)" value="shiny:active" icon={Icon.Check} />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {customSprites.length > 0 && (
        <List.Section key="custom" title="Custom">
          {customSprites
            .filter((p) => filter === "all" || isActive(p))
            .map((p) => (
              <List.Item
                key={p.name}
                title={displayName(p.name)}
                subtitle="Custom"
                icon={spriteIcon(p, false) ?? Icon.Brush}
                accessories={isActive(p) ? [{ icon: Icon.Check, tooltip: "Currently Active" }] : []}
                actions={
                  <ActionPanel>
                    <Action title="Select Sprite" icon={Icon.Checkmark} onAction={() => selectSprite(p)} />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      )}
      {[1, 2, 3, 4].map((gen) => (
        <List.Section key={gen} title={`Gen ${gen}`}>
          {allPokemon
            .filter((p) => p.gen === gen && (filter === "all" || isActive(p)))
            .map((p) => (
              <List.Item
                key={p.name}
                title={displayName(p.name)}
                subtitle={genLabel(p.gen)}
                icon={spriteIcon(p, shiny)}
                accessories={isActive(p) ? [{ icon: Icon.Check, tooltip: "Currently Active" }] : []}
                actions={
                  <ActionPanel>
                    <Action title="Select Sprite" icon={Icon.Checkmark} onAction={() => selectSprite(p)} />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}
