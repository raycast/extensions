import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getFavicon, showFailureToast, usePromise } from "@raycast/utils";
import path from "node:path";
import {
  openInSearchBrowser,
  readOptionalJSON,
  webAddress,
} from "./browser-actions";

const FIRST_SPACE_ID = "00000000-0000-0000-0000-000000000001";
const SUPPORT_DIRECTORY = path.join(
  process.env.HOME ?? "",
  "Library",
  "Application Support",
  "Search",
);

interface Pin {
  id?: string;
  letter?: string;
  home?: string;
  title?: string;
  name?: string;
}

interface Space {
  id?: string;
  name?: string;
  profile?: string;
}

interface Profiles {
  id?: string;
  name?: string;
}

interface ListedPin {
  id: string;
  title: string;
  url: string;
  label: string;
  scope: string;
}

async function loadPins(): Promise<ListedPin[]> {
  const [pinsValue, spacesValue, profilesValue] = await Promise.all([
    readOptionalJSON(path.join(SUPPORT_DIRECTORY, "pins.json")),
    readOptionalJSON(path.join(SUPPORT_DIRECTORY, "spaces.json")),
    readOptionalJSON(path.join(SUPPORT_DIRECTORY, "profiles.json")),
  ]);

  if (pinsValue === undefined) return [];
  if (!pinsValue || typeof pinsValue !== "object" || Array.isArray(pinsValue)) {
    throw new Error("Unexpected pins file format.");
  }

  const spaces = Array.isArray(spacesValue) ? (spacesValue as Space[]) : [];
  const profiles = Array.isArray(profilesValue)
    ? (profilesValue as Profiles[])
    : [];
  const spaceNames = new Map(
    spaces.flatMap((space) =>
      typeof space.id === "string"
        ? [[space.id.toLowerCase(), space] as const]
        : [],
    ),
  );
  const profileNames = new Map(
    profiles.flatMap((profile) =>
      typeof profile.id === "string"
        ? [[profile.id.toLowerCase(), profile.name || "Profile"] as const]
        : [],
    ),
  );

  const listed: ListedPin[] = [];
  const data = pinsValue as Record<string, unknown>;
  for (const [scopeKey, entries] of Object.entries(data)) {
    if (!Array.isArray(entries)) continue;
    const isShared = scopeKey === "shared" || scopeKey.startsWith("shared:");
    const profileId = scopeKey.startsWith("shared:")
      ? scopeKey.slice("shared:".length)
      : undefined;
    const space = spaceNames.get(scopeKey.toLowerCase());
    const scope = isShared
      ? `Every space${profileId ? ` · ${profileNames.get(profileId.toLowerCase()) ?? "Profile"}` : ""}`
      : (space?.name ??
        (scopeKey.toLowerCase() === FIRST_SPACE_ID ? "Personal" : "Space"));

    entries.forEach((value, index) => {
      if (!value || typeof value !== "object") return;
      const pin = value as Pin;
      const url = webAddress(pin.home);
      if (!url) return;
      const name =
        typeof pin.name === "string" && pin.name.trim()
          ? pin.name.trim()
          : undefined;
      const title =
        typeof pin.title === "string" && pin.title.trim()
          ? pin.title.trim()
          : new URL(url).hostname;
      listed.push({
        id: typeof pin.id === "string" ? pin.id : `${scopeKey}:${index}:${url}`,
        title: name ?? title,
        url,
        label: typeof pin.letter === "string" ? pin.letter : "",
        scope,
      });
    });
  }
  return listed;
}

export default function Pins() {
  const { data, isLoading, error, revalidate } = usePromise(loadPins);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Search Browser pins"
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Couldn't Load Pins"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={() => revalidate()}
              />
            </ActionPanel>
          }
        />
      ) : (data ?? []).length === 0 ? (
        <List.EmptyView
          icon={Icon.Pin}
          title="No Pins Found"
          description="Pins you create in Search Browser will appear here."
        />
      ) : (
        (data ?? []).map((pin) => (
          <List.Item
            key={pin.id}
            title={pin.title}
            subtitle={`${pin.scope} · ${new URL(pin.url).hostname}`}
            keywords={[pin.url, pin.scope, pin.label]}
            icon={getFavicon(pin.url)}
            accessories={pin.label ? [{ text: pin.label }] : undefined}
            actions={
              <ActionPanel>
                <Action
                  title="Open in Search Browser"
                  icon={Icon.Globe}
                  onAction={() =>
                    openInSearchBrowser(pin.url).catch((actionError: unknown) =>
                      showFailureToast(actionError, {
                        title: "Couldn't Open Pin",
                      }),
                    )
                  }
                />
                <Action.OpenInBrowser url={pin.url} />
                <Action.CopyToClipboard title="Copy URL" content={pin.url} />
                <Action
                  title="Refresh Pins"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => revalidate()}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
