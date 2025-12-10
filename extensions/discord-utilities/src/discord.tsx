function BookmarksSection(props: {
  bookmarks: Bookmark[];
  onSave: (next: Bookmark[]) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const { bookmarks, onSave, onRemove } = props;
  const { push } = useNavigation();

  const onCreate = () => push(<BookmarkForm onSubmit={async (bm) => onSave([...(bookmarks || []), bm])} />);
  const onEdit = (bm: Bookmark) =>
    push(
      <BookmarkForm
        initial={bm}
        onSubmit={async (updated) => {
          const next = bookmarks.map((b) => (b.id === updated.id ? updated : b));
          await onSave(next);
        }}
      />,
    );

  return (
    <List.Section title="Bookmarks" subtitle={bookmarks.length ? `${bookmarks.length}` : undefined}>
      <List.Item
        title="Add Message Bookmark"
        icon={Icon.Bookmark}
        accessories={[{ text: "Save a message link" }]}
        actions={
          <ActionPanel>
            <Action title="Add Message Bookmark" icon={Icon.Bookmark} onAction={onCreate} />
          </ActionPanel>
        }
      />
      {bookmarks.map((bm) => (
        <List.Item
          key={bm.id}
          title={bm.name}
          icon={Icon.Bookmark}
          accessories={(bm.tags || []).map((t) => ({ tag: t }))}
          keywords={bm.tags}
          actions={
            <ActionPanel>
              <Action
                title="Open"
                icon={Icon.ArrowRight}
                onAction={async () => {
                  await openDeepLink(bm.link);
                  await showToast(Toast.Style.Success, `Opened ${bm.name}`);
                }}
              />
              <Action.CopyToClipboard title="Copy Link" content={bm.link} />
              <Action title="Edit" icon={Icon.Pencil} onAction={() => onEdit(bm)} />
              <Action
                title="Remove"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => onRemove(bm.id)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
}

function FlavorChooser(props: { options: InstallFlavor[]; onChoose: (f: InstallFlavor) => void | Promise<void> }) {
  const { options, onChoose } = props;
  const titles: Record<InstallFlavor, string> = {
    stable: "Discord (Stable)",
    ptb: "Discord PTB",
    canary: "Discord Canary",
  };
  const icons: Record<InstallFlavor, Icon> = {
    stable: Icon.AppWindow,
    ptb: Icon.AppWindowGrid2x2,
    canary: Icon.AppWindowList,
  };
  return (
    <List searchBarPlaceholder="Choose your Discord installation">
      <List.Section title="Multiple Installations Found" subtitle={`${options.length}`}>
        {options.map((f) => (
          <List.Item
            key={f}
            title={titles[f]}
            icon={icons[f]}
            actions={
              <ActionPanel>
                <Action
                  title={`Use ${titles[f]}`}
                  onAction={async () => {
                    await onChoose(f);
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function BookmarkForm(props: { initial?: Bookmark; onSubmit: (bm: Bookmark) => Promise<void> }) {
  const { initial, onSubmit } = props;
  const { pop } = useNavigation();

  const [name, setName] = useState(initial?.name ?? "");
  const [link, setLink] = useState(initial?.link ?? "");
  const [tags, setTags] = useState<string>((initial?.tags || []).join(", "));

  const handleSubmit = async () => {
    const final = link.trim();
    const messageUrlRe = /^https?:\/\/(?:www\.)?discord\.com\/channels\/(?:@me|\d+)\/\d+\/\d+$/i;
    if (!messageUrlRe.test(final)) {
      await showToast(
        Toast.Style.Failure,
        "Invalid Message Link",
        "Paste a full https://discord.com/channels/<guildOr@me>/<channel>/<message> URL.",
      );
      return;
    }

    const bm: Bookmark = {
      id: initial?.id ?? genId(),
      name: name.trim() || "Message",
      link: final,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    await onSubmit(bm);
    await showToast(Toast.Style.Success, initial ? "Bookmark Updated" : "Bookmark Added");
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={initial ? "Save Changes" : "Add Bookmark"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="e.g., Important message" value={name} onChange={setName} />
      <Form.Separator />
      <Form.Description
        title="Message Link"
        text="Paste the full Discord message URL (e.g., https://discord.com/channels/<guildOr@me>/<channel>/<message>)."
      />
      <Form.TextField
        id="link"
        title="Message URL"
        placeholder="https://discord.com/channels/<guildOr@me>/<channel>/<message>"
        value={link}
        onChange={setLink}
      />
      <Form.Separator />
      <Form.TextField id="tags" title="Tags" placeholder="comma, separated, tags" value={tags} onChange={setTags} />
    </Form>
  );
}

import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  LocalStorage,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showToast,
  useNavigation,
  Alert,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import {
  getKeybindsLink,
  getSettingsLink,
  getSettingsSubLink,
  openDeepLink,
  openDiscord,
  resolveDiscordPaths,
  makeServerLink,
  makeChannelLink,
  makeDmLink,
  isDiscordDeepLink,
} from "./utils/discord";
import type { InstallFlavor, PinnedLink, Preferences, PinType, Bookmark } from "./types";
// Simple ID generator to avoid extra dependencies
function genId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const PINS_KEY = "pinnedLinks";
const BOOKMARKS_KEY = "discordBookmarks";
const CHOSEN_FLAVOR_KEY = "chosenFlavor";
const SAVED_GUILDS_KEY = "savedGuildIds"; // stores [{ id, name }]

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const [pins, setPins] = useState<PinnedLink[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [paths, setPaths] = useState<{ stable?: string; ptb?: string; canary?: string }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [chosenFlavor, setChosenFlavor] = useState<InstallFlavor | undefined>(undefined);
  const [needChooseFlavor, setNeedChooseFlavor] = useState(false);
  const [availableFlavors, setAvailableFlavors] = useState<InstallFlavor[]>([]);

  // Load pins and resolve paths at start
  useEffect(() => {
    (async () => {
      try {
        const raw = await LocalStorage.getItem<string>(PINS_KEY);
        setPins(raw ? (JSON.parse(raw) as PinnedLink[]) : []);
      } catch {
        setPins([]);
      }
      try {
        const rawBm = await LocalStorage.getItem<string>(BOOKMARKS_KEY);
        setBookmarks(rawBm ? (JSON.parse(rawBm) as Bookmark[]) : []);
      } catch {
        setBookmarks([]);
      }
      try {
        const storedChosen = await LocalStorage.getItem<string>(CHOSEN_FLAVOR_KEY);
        if (storedChosen === "stable" || storedChosen === "ptb" || storedChosen === "canary") {
          setChosenFlavor(storedChosen);
        }
      } catch {
        // ignore
      }
      try {
        const resolved = await resolveDiscordPaths(preferences);
        setPaths(resolved);
        // Determine available installations
        const found: InstallFlavor[] = (Object.entries(resolved) as [InstallFlavor, string | undefined][]) // typed cast
          .filter(([, p]) => !!p)
          .map(([k]) => k);
        setAvailableFlavors(found);
        // If no chosen flavor yet, auto-pick when exactly one is found; otherwise ask user
        const hasChosen = !!(await LocalStorage.getItem<string>(CHOSEN_FLAVOR_KEY));
        if (!hasChosen) {
          if (found.length === 1) {
            const only = found[0];
            setChosenFlavor(only);
            await LocalStorage.setItem(CHOSEN_FLAVOR_KEY, only);
            await showToast(Toast.Style.Success, `Using ${only} Discord`);
          } else if (found.length > 1) {
            setNeedChooseFlavor(true);
          }
        }
      } catch (e: unknown) {
        // Best-effort: paths may remain undefined; actions will show toasts if missing
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const onSavePins = async (next: PinnedLink[]) => {
    setPins(next);
    await LocalStorage.setItem(PINS_KEY, JSON.stringify(next));
  };

  const onRemovePin = async (id: string) => {
    const ok = await confirmAlert({ title: "Remove Pin?", message: "This will delete the pinned link." });
    if (!ok) return;
    const next = pins.filter((p) => p.id !== id);
    await onSavePins(next);
  };

  // Bookmarks persistence
  const onSaveBookmarks = async (next: Bookmark[]) => {
    setBookmarks(next);
    await LocalStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
  };

  const onRemoveBookmark = async (id: string) => {
    const ok = await confirmAlert({ title: "Remove Bookmark?", message: "This will delete the bookmark." });
    if (!ok) return;
    const next = bookmarks.filter((b) => b.id !== id);
    await onSaveBookmarks(next);
  };

  const effectiveFlavor: InstallFlavor = (chosenFlavor || preferences.preferredFlavor || "stable") as InstallFlavor;
  const openPreferred = async () => {
    await openDiscord(effectiveFlavor, paths[effectiveFlavor]);
  };

  const settingsUrl = useMemo(() => getSettingsLink(), []);
  const keybindsUrl = useMemo(() => getKeybindsLink(), []);
  const showProfiles = !(preferences?.preferredFlavor || chosenFlavor); // hide profiles once a flavor is chosen

  if (needChooseFlavor) {
    return (
      <FlavorChooser
        options={availableFlavors}
        onChoose={async (f) => {
          setChosenFlavor(f);
          await LocalStorage.setItem(CHOSEN_FLAVOR_KEY, f);
          setNeedChooseFlavor(false);
          await showToast(Toast.Style.Success, `Using ${f} Discord`);
        }}
      />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search pins by name or tag">
      <PinnedSection pins={pins} onSave={onSavePins} onRemove={onRemovePin} />
      <BookmarksSection bookmarks={bookmarks} onSave={onSaveBookmarks} onRemove={onRemoveBookmark} />
      {showProfiles ? <ProfilesSection paths={paths} /> : null}
      <ActionsSection onOpenPreferred={openPreferred} settingsUrl={settingsUrl} keybindsUrl={keybindsUrl} />
    </List>
  );
}

function PinnedSection(props: {
  pins: PinnedLink[];
  onSave: (next: PinnedLink[]) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const { pins, onSave, onRemove } = props;
  const { push } = useNavigation();

  const onCreate = () => push(<PinForm onSubmit={async (pin) => onSave([...pins, pin])} />);

  const onEdit = (pin: PinnedLink) =>
    push(
      <PinForm
        initial={pin}
        onSubmit={async (updated) => {
          const next = pins.map((p) => (p.id === updated.id ? updated : p));
          await onSave(next);
        }}
      />,
    );

  const dmPins = pins.filter((p) => p.type === "dm");
  const serverPins = pins.filter((p) => p.type === "server");
  const channelPins = pins.filter((p) => p.type === "channel");

  // Helper to extract guild id from a discord deep link
  const extractGuildId = (link: string): string | undefined => {
    const m = link.match(/discord:\/\/-\/channels\/(\d+)/i);
    return m?.[1];
  };
  const extractGuildIdFromChannel = (link: string): string | undefined => {
    const m = link.match(/discord:\/\/-\/channels\/(\d+)\/(\d+)/i);
    return m?.[1];
  };

  // Build server map for grouping and display names
  const serverByGuild: Record<string, { pin: PinnedLink; name: string }> = {};
  for (const sp of serverPins) {
    const gid = extractGuildId(sp.link);
    if (gid) serverByGuild[gid] = { pin: sp, name: sp.name };
  }
  const channelsByGuild: Record<string, PinnedLink[]> = {};
  for (const cp of channelPins) {
    const gid = extractGuildIdFromChannel(cp.link);
    if (!gid) continue;
    if (!channelsByGuild[gid]) channelsByGuild[gid] = [];
    channelsByGuild[gid].push(cp);
  }

  // Deterministic color by tag value
  const colorForTag = (tag: string): string => {
    const palette = [
      "#3B82F6", // blue
      "#10B981", // green
      "#F59E0B", // yellow/orange
      "#EF4444", // red
      "#8B5CF6", // purple
      "#EC4899", // pink
      "#14B8A6", // teal
      "#A16207", // brownish
    ];
    let hash = 0;
    for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) >>> 0;
    return palette[hash % palette.length];
  };

  return (
    <>
      <List.Item
        title="Add Pin"
        icon={Icon.Plus}
        accessories={[{ text: "Create a new pin" }]}
        actions={
          <ActionPanel>
            <Action title="Add Pin" icon={Icon.Plus} onAction={onCreate} />
          </ActionPanel>
        }
      />

      {dmPins.length > 0 && (
        <List.Section title="Direct Messages" subtitle={`${dmPins.length}`}>
          {dmPins.map((pin) => (
            <List.Item
              key={pin.id}
              title={pin.name}
              accessories={(pin.tags || []).map((t) => ({ tag: t }))}
              keywords={pin.tags}
              icon={Icon.Link}
              actions={
                <ActionPanel>
                  <Action
                    title="Open"
                    icon={Icon.ArrowRight}
                    onAction={async () => {
                      if (!pin.link.toLowerCase().startsWith("discord://")) {
                        await showToast(Toast.Style.Failure, "Invalid Link", "Must start with discord://");
                        return;
                      }
                      await openDeepLink(pin.link);
                      await showToast(Toast.Style.Success, `Opened ${pin.name}`);
                    }}
                  />
                  <Action.CopyToClipboard title="Copy Link" content={pin.link} />
                  <Action title="Edit" icon={Icon.Pencil} onAction={() => onEdit(pin)} />
                  <Action
                    title="Remove This Dm Pin"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => onRemove(pin.id)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* Servers and their Channels (grouped per server) */}
      {(serverPins.length > 0 || channelPins.length > 0) && (
        <>
          {serverPins.map((sp) => {
            // compute list of channels for this server
            const gid = extractGuildId(sp.link);
            const cps = gid && channelsByGuild[gid] ? channelsByGuild[gid] : [];
            return (
              <List.Section key={`srv-${sp.id}`} title={sp.name}>
                <List.Item
                  key={sp.id}
                  title={sp.name}
                  icon={Icon.TwoPeople}
                  accessories={(sp.tags || []).map((t) => ({ tag: { value: t, color: colorForTag(t) } }))}
                  keywords={sp.tags}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Open Server"
                        icon={Icon.ArrowRight}
                        onAction={async () => {
                          await openDeepLink(sp.link);
                          await showToast(Toast.Style.Success, `Opened ${sp.name}`);
                        }}
                      />
                      <Action
                        title="Add Channel to This Server"
                        icon={Icon.Hashtag}
                        onAction={() => {
                          const gid = extractGuildId(sp.link);
                          if (!gid) return;
                          push(
                            <PinForm
                              defaultType="channel"
                              defaultGuildId={gid}
                              defaultGuildName={sp.name}
                              onSubmit={async (pin) => onSave([...(pins || []), pin])}
                            />,
                          );
                        }}
                      />
                      <Action.CopyToClipboard title="Copy Link" content={sp.link} />
                      <Action title="Edit" icon={Icon.Pencil} onAction={() => onEdit(sp)} />
                      <Action
                        title="Remove This Server Pin"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={async () => {
                          const gid = extractGuildId(sp.link);
                          if (!gid) {
                            await onRemove(sp.id);
                            return;
                          }
                          const relatedChannels = channelsByGuild[gid] || [];
                          const confirmed = await confirmAlert({
                            title: "Remove server and its channels?",
                            message:
                              relatedChannels.length > 0
                                ? `This will remove the server pin and ${relatedChannels.length} channel pin(s) under it.`
                                : "This will remove the server pin.",
                            primaryAction: {
                              title: "Remove All",
                              style: Alert.ActionStyle.Destructive,
                            },
                          });
                          if (!confirmed) return;
                          const idsToRemove = new Set<string>([sp.id, ...relatedChannels.map((c) => c.id)]);
                          const next = (pins || []).filter((p) => !idsToRemove.has(p.id));
                          await onSave(next);
                          await showToast(Toast.Style.Success, "Removed server and related channels");
                        }}
                      />
                    </ActionPanel>
                  }
                />
                {cps.map((cp) => (
                  <List.Item
                    key={cp.id}
                    title={cp.name}
                    icon={Icon.Hashtag}
                    accessories={[
                      { tag: { value: sp.name } },
                      ...(cp.tags || []).map((t) => ({ tag: { value: t, color: colorForTag(t) } })),
                    ]}
                    keywords={[sp.name, ...(cp.tags || [])]}
                    actions={
                      <ActionPanel>
                        <Action
                          title={`Open ${cp.name}`}
                          icon={Icon.ArrowRight}
                          onAction={async () => {
                            await openDeepLink(cp.link);
                            await showToast(Toast.Style.Success, `Opened ${cp.name}`);
                          }}
                        />
                        <Action.CopyToClipboard title="Copy Link" content={cp.link} />
                        <Action title="Edit" icon={Icon.Pencil} onAction={() => onEdit(cp)} />
                        <Action
                          title="Remove This Channel Pin"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          onAction={() => onRemove(cp.id)}
                        />
                      </ActionPanel>
                    }
                  />
                ))}
              </List.Section>
            );
          })}

          {/* Channels without a matching server pin */}
          {Object.entries(channelsByGuild)
            .filter(([gid]) => !serverByGuild[gid])
            .map(([gid, cps]) => (
              <List.Section key={`orphan-${gid}`} title={`Server ${gid}`}>
                {cps.map((cp) => (
                  <List.Item
                    key={cp.id}
                    title={cp.name}
                    icon={Icon.Hashtag}
                    accessories={[
                      { tag: { value: gid } },
                      ...(cp.tags || []).map((t) => ({ tag: { value: t, color: colorForTag(t) } })),
                    ]}
                    keywords={[gid, ...(cp.tags || [])]}
                    actions={
                      <ActionPanel>
                        <Action
                          title={`Open ${cp.name}`}
                          icon={Icon.ArrowRight}
                          onAction={async () => {
                            await openDeepLink(cp.link);
                            await showToast(Toast.Style.Success, `Opened ${cp.name}`);
                          }}
                        />
                        <Action.CopyToClipboard title="Copy Link" content={cp.link} />
                        <Action title="Edit" icon={Icon.Pencil} onAction={() => onEdit(cp)} />
                        <Action
                          title="Remove This Channel Pin"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          onAction={() => onRemove(cp.id)}
                        />
                      </ActionPanel>
                    }
                  />
                ))}
              </List.Section>
            ))}
        </>
      )}
    </>
  );
}

function ProfilesSection(props: { paths: { stable?: string; ptb?: string; canary?: string } }) {
  const { paths } = props;

  const Item = ({ flavor, path, title }: { flavor: InstallFlavor; path?: string; title: string }) => (
    <List.Item
      title={title}
      subtitle={flavor.toUpperCase()}
      icon={Icon.AppWindow}
      accessories={[{ text: path ? "Resolved" : "Not Found" }]}
      actions={
        <ActionPanel>
          <Action
            title="Open"
            icon={Icon.ArrowRight}
            onAction={async () => {
              await openDiscord(flavor, path);
            }}
          />
          {path ? <Action.CopyToClipboard title="Copy Path" content={path} /> : null}
        </ActionPanel>
      }
    />
  );

  return (
    <List.Section title="Profiles">
      <Item flavor="stable" path={paths.stable} title="Discord Stable" />
      <Item flavor="ptb" path={paths.ptb} title="Discord PTB" />
      <Item flavor="canary" path={paths.canary} title="Discord Canary" />
    </List.Section>
  );
}

function ActionsSection(props: { onOpenPreferred: () => Promise<void>; settingsUrl: string; keybindsUrl: string }) {
  const { onOpenPreferred, settingsUrl, keybindsUrl } = props;
  return (
    <List.Section title="Actions">
      <List.Item
        title="Open Discord (Preferred)"
        icon={Icon.AppWindow}
        actions={
          <ActionPanel>
            <Action
              title="Open Discord"
              icon={Icon.AppWindow}
              onAction={async () => {
                await onOpenPreferred();
              }}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Open Settings"
        icon={Icon.Gear}
        actions={
          <ActionPanel>
            <Action
              title="Open Settings"
              icon={Icon.Gear}
              onAction={async () => {
                await openDeepLink(settingsUrl);
                await showToast(Toast.Style.Success, "Opened Discord Settings");
              }}
            />
            <Action.CopyToClipboard title="Copy Settings Link" content={settingsUrl} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Open Keybinds"
        icon={Icon.CommandSymbol}
        actions={
          <ActionPanel>
            <Action
              title="Open Keybinds"
              icon={Icon.CommandSymbol}
              onAction={async () => {
                await openDeepLink(keybindsUrl);
                await showToast(Toast.Style.Success, "Opened Discord Keybinds");
              }}
            />
            <Action.CopyToClipboard title="Copy Keybinds Link" content={keybindsUrl} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Settings: Voice & Video"
        icon={Icon.Microphone}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Voice & Video" url={getSettingsSubLink("voice")} />
            <Action.CopyToClipboard title="Copy Link" content={getSettingsSubLink("voice")} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Settings: Notifications"
        icon={Icon.Bell}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Notifications" url={getSettingsSubLink("notifications")} />
            <Action.CopyToClipboard title="Copy Link" content={getSettingsSubLink("notifications")} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Settings: Appearance"
        icon={Icon.Eye}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Appearance" url={getSettingsSubLink("appearance")} />
            <Action.CopyToClipboard title="Copy Link" content={getSettingsSubLink("appearance")} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Settings: Accessibility"
        icon={Icon.Person}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Accessibility" url={getSettingsSubLink("accessibility")} />
            <Action.CopyToClipboard title="Copy Link" content={getSettingsSubLink("accessibility")} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Settings: Privacy & Safety"
        icon={Icon.Lock}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Privacy & Safety" url={getSettingsSubLink("privacy")} />
            <Action.CopyToClipboard title="Copy Link" content={getSettingsSubLink("privacy")} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Settings: Advanced / Developer"
        icon={Icon.Terminal}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Advanced / Developer" url={getSettingsSubLink("advanced")} />
            <Action.CopyToClipboard title="Copy Link" content={getSettingsSubLink("advanced")} />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}

function PinForm(props: {
  initial?: PinnedLink;
  onSubmit: (pin: PinnedLink) => Promise<void>;
  defaultType?: PinType;
  defaultGuildId?: string;
  defaultGuildName?: string;
}) {
  const { initial, onSubmit } = props;
  const { pop } = useNavigation();

  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<PinType>(initial?.type || props.defaultType || "server");
  const [link, setLink] = useState(initial?.link ?? "");
  const [tags, setTags] = useState<string>((initial?.tags || []).join(", "));
  const [guildId, setGuildId] = useState<string>(props.defaultGuildId || "");
  const [channelId, setChannelId] = useState<string>("");
  type SavedGuild = { id: string; name: string };
  const [savedGuilds, setSavedGuilds] = useState<SavedGuild[]>([]);
  const [guildChoice, setGuildChoice] = useState<string>(props.defaultGuildId ? props.defaultGuildId : "custom"); // value is either a guildId from savedGuilds or "custom"

  useEffect(() => {
    (async () => {
      try {
        const raw = await LocalStorage.getItem<string>(SAVED_GUILDS_KEY);
        if (!raw) {
          // If no saved guilds yet, still make sure default guild appears
          const initial: SavedGuild[] = props.defaultGuildId
            ? [{ id: props.defaultGuildId, name: props.defaultGuildName || props.defaultGuildId }]
            : [];
          setSavedGuilds(initial);
          return;
        }
        const parsed = JSON.parse(raw);
        // Backward compatibility: if it was ["gid", ...], convert to objects
        if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
          let converted: SavedGuild[] = parsed.map((id: string) => ({ id, name: id }));
          // Ensure default guild is present
          if (props.defaultGuildId && !converted.find((g) => g.id === props.defaultGuildId)) {
            converted = [
              ...converted,
              { id: props.defaultGuildId, name: props.defaultGuildName || props.defaultGuildId },
            ];
          }
          setSavedGuilds(converted);
          await LocalStorage.setItem(SAVED_GUILDS_KEY, JSON.stringify(converted));
        } else if (Array.isArray(parsed)) {
          const objs: SavedGuild[] = parsed
            .map((x) =>
              x && typeof x.id === "string"
                ? { id: x.id, name: typeof x.name === "string" && x.name ? x.name : x.id }
                : null,
            )
            .filter(Boolean) as SavedGuild[];
          // Enrich names from existing server pins if name === id
          try {
            const pinsRaw = await LocalStorage.getItem<string>(PINS_KEY);
            const pinsArr = pinsRaw ? (JSON.parse(pinsRaw) as PinnedLink[]) : [];
            const serverPins = pinsArr.filter((p) => p.type === "server");
            const extractGuildId = (link: string): string | undefined => {
              const m = link.match(/discord:\/\/-\/channels\/(\d+)/i);
              return m?.[1];
            };
            const nameByGid = new Map<string, string>();
            for (const sp of serverPins) {
              const gid = extractGuildId(sp.link);
              if (gid) nameByGid.set(gid, sp.name || gid);
            }
            let enriched = objs.map((g) =>
              g.name === g.id && nameByGid.get(g.id) ? { ...g, name: nameByGid.get(g.id)! } : g,
            );
            // Ensure default guild is present
            if (props.defaultGuildId && !enriched.find((g) => g.id === props.defaultGuildId)) {
              enriched = [
                ...enriched,
                { id: props.defaultGuildId, name: props.defaultGuildName || props.defaultGuildId },
              ];
            }
            setSavedGuilds(enriched);
            if (JSON.stringify(enriched) !== JSON.stringify(objs)) {
              await LocalStorage.setItem(SAVED_GUILDS_KEY, JSON.stringify(enriched));
            }
          } catch {
            const list =
              props.defaultGuildId && !objs.find((g) => g.id === props.defaultGuildId)
                ? [...objs, { id: props.defaultGuildId, name: props.defaultGuildName || props.defaultGuildId }]
                : objs;
            setSavedGuilds(list);
          }
        } else {
          const initial: SavedGuild[] = props.defaultGuildId
            ? [{ id: props.defaultGuildId, name: props.defaultGuildName || props.defaultGuildId }]
            : [];
          setSavedGuilds(initial);
        }
      } catch {
        const fallback: SavedGuild[] = props.defaultGuildId
          ? [{ id: props.defaultGuildId, name: props.defaultGuildName || props.defaultGuildId }]
          : [];
        setSavedGuilds(fallback);
      }
    })();
  }, []);

  // If a default guild was provided, prefer selecting it in the dropdown when type is channel
  useEffect(() => {
    if (props.defaultGuildId && type === "channel") {
      setGuildChoice(props.defaultGuildId);
      setGuildId(props.defaultGuildId);
    }
  }, [props.defaultGuildId, type]);

  const handleSubmit = async () => {
    let finalLink = link.trim();

    // Accept either a full discord:// link, or compose from IDs based on type
    if (!finalLink) {
      if (type === "server" && guildId.trim()) {
        finalLink = makeServerLink(guildId.trim());
      } else if (type === "channel" && guildId.trim() && channelId.trim()) {
        finalLink = makeChannelLink(guildId.trim(), channelId.trim());
      } else if (type === "dm" && channelId.trim()) {
        finalLink = makeDmLink(channelId.trim());
      }
    }

    if (!isDiscordDeepLink(finalLink)) {
      await showToast(
        Toast.Style.Failure,
        "Invalid Link",
        "Provide a discord:// link or valid IDs for the selected type.",
      );
      return;
    }
    const pin: PinnedLink = {
      id: initial?.id ?? genId(),
      name: name.trim() || "Untitled",
      type,
      link: finalLink,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    await onSubmit(pin);
    // Persist server (guild) IDs when the user pins a server
    if (!initial && type === "server" && guildId.trim()) {
      const id = guildId.trim();
      const displayName = pin.name || id;
      const mapById = new Map<string, SavedGuild>((savedGuilds || []).map((g) => [g.id, g]));
      mapById.set(id, { id, name: displayName });
      const next = Array.from(mapById.values());
      setSavedGuilds(next);
      await LocalStorage.setItem(SAVED_GUILDS_KEY, JSON.stringify(next));
    }
    await showToast(Toast.Style.Success, initial ? "Pin Updated" : "Pin Added");
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={initial ? "Save Changes" : "Add Pin"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="e.g., #general — MyServer" value={name} onChange={setName} />
      <Form.Dropdown id="type" title="Type" value={type} onChange={(v) => setType(v as PinType)}>
        <Form.Dropdown.Item value="server" title="Server" />
        <Form.Dropdown.Item value="channel" title="Channel" />
        <Form.Dropdown.Item value="dm" title="Direct Message" />
      </Form.Dropdown>
      <Form.Separator />
      <Form.Description
        title="Compose by IDs (optional)"
        text={
          type === "server"
            ? "Enter the Guild ID to build a server link if no full discord:// URL is provided."
            : type === "channel"
              ? "Pick a saved Guild (or enter manually) and provide the Channel ID to build the link."
              : "Provide the DM Channel ID to build the link."
        }
      />
      {type === "channel" && (savedGuilds.length > 0 || props.defaultGuildId) ? (
        <>
          <Form.Dropdown
            id="guildChoice"
            title="Guild"
            value={guildChoice}
            onChange={(v) => {
              setGuildChoice(v);
              if (v !== "custom") setGuildId(v);
            }}
          >
            {(() => {
              const options: { id: string; name: string }[] = [];
              if (props.defaultGuildId) {
                options.push({ id: props.defaultGuildId, name: props.defaultGuildName || props.defaultGuildId });
              }
              for (const g of savedGuilds) {
                if (!options.find((o) => o.id === g.id)) options.push(g);
              }
              return options.map((g) => <Form.Dropdown.Item key={g.id} value={g.id} title={g.name} />);
            })()}
            <Form.Dropdown.Item value="custom" title="Enter Manually" />
          </Form.Dropdown>
          {guildChoice === "custom" ? (
            <Form.TextField
              id="guildId"
              title="Guild ID"
              placeholder="e.g., 123456789012345678"
              value={guildId}
              onChange={setGuildId}
            />
          ) : null}
        </>
      ) : type === "channel" ? (
        <Form.TextField
          id="guildId"
          title="Guild ID"
          placeholder="e.g., 123456789012345678"
          value={guildId}
          onChange={setGuildId}
        />
      ) : type === "server" ? (
        <Form.TextField
          id="guildId"
          title="Guild ID"
          placeholder="e.g., 123456789012345678"
          value={guildId}
          onChange={setGuildId}
        />
      ) : null}
      {type === "channel" && (
        <Form.TextField
          id="channelId"
          title="Channel ID"
          placeholder="e.g., 123456789012345678"
          value={channelId}
          onChange={setChannelId}
        />
      )}
      {type === "dm" && (
        <Form.TextField
          id="channelId"
          title="DM Channel ID"
          placeholder="e.g., 123456789012345678"
          value={channelId}
          onChange={setChannelId}
        />
      )}
      <Form.Separator />
      <Form.TextField
        id="link"
        title="Link (optional)"
        placeholder="discord://-/channels/<guild>/<channel>"
        value={link}
        onChange={setLink}
      />
      <Form.TextField id="tags" title="Tags" placeholder="comma, separated, tags" value={tags} onChange={setTags} />
    </Form>
  );
}
