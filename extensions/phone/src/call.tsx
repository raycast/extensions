import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  LaunchProps,
  List,
  open,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { Contact, loadContacts } from "./contacts";
import { formatDisplay, getCountryFlag } from "./format";
import { frecencyScore, getFrecency, recordCall } from "./frecency";

type FrecencyMap = Awaited<ReturnType<typeof getFrecency>>;
type DialScheme = "tel" | "facetime-audio" | "facetime";

function matchesQuery(contact: Contact, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  if (contact.name.toLowerCase().includes(q)) return true;
  return contact.phones.some((p) => p.value.includes(q));
}

function rankByQueryRelevance(
  contacts: Contact[],
  query: string,
  frecency: FrecencyMap,
): Contact[] {
  const q = query.toLowerCase();
  return [...contacts].sort((a, b) => {
    const an = a.name.toLowerCase();
    const bn = b.name.toLowerCase();
    const aStarts = an.startsWith(q)
      ? 0
      : an.split(/\s+/).some((w) => w.startsWith(q))
        ? 1
        : 2;
    const bStarts = bn.startsWith(q)
      ? 0
      : bn.split(/\s+/).some((w) => w.startsWith(q))
        ? 1
        : 2;
    if (aStarts !== bStarts) return aStarts - bStarts;
    const sa = bestScoreForContact(a, frecency);
    const sb = bestScoreForContact(b, frecency);
    if (sa !== sb) return sb - sa;
    return a.name.localeCompare(b.name);
  });
}

function bestScoreForContact(c: Contact, frecency: FrecencyMap): number {
  let best = 0;
  for (const phone of c.phones) {
    const score = frecencyScore(frecency[`${c.id}::${phone.value}`]);
    if (score > best) best = score;
  }
  return best;
}

function rankContacts(contacts: Contact[], frecency: FrecencyMap): Contact[] {
  return [...contacts].sort((a, b) => {
    const sa = bestScoreForContact(a, frecency);
    const sb = bestScoreForContact(b, frecency);
    if (sa !== sb) return sb - sa;
    return a.name.localeCompare(b.name);
  });
}

const ACTION_VERB: Record<DialScheme, string> = {
  tel: "Call",
  "facetime-audio": "FaceTime Audio",
  facetime: "FaceTime Video",
};

const ACTION_ICON: Record<DialScheme, Icon> = {
  tel: Icon.Phone,
  "facetime-audio": Icon.Microphone,
  facetime: Icon.Video,
};

export default function Command(
  props: LaunchProps<{ arguments: Arguments.Call }>,
) {
  const prefs = getPreferenceValues<Preferences>();
  const defaultScheme: DialScheme = prefs.defaultAction ?? "tel";
  const initialQuery = props.arguments?.name?.trim() ?? "";
  const [searchText, setSearchText] = useState(initialQuery);

  const {
    data: contacts,
    isLoading,
    revalidate,
  } = useCachedPromise(loadContacts, [false], {
    initialData: [] as Contact[],
  });

  const [frecency, setFrecency] = useState<FrecencyMap>({});
  useEffect(() => {
    getFrecency()
      .then(setFrecency)
      .catch(async (err) => {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not load call history",
          message: String(err),
        });
      });
  }, []);

  async function dial(
    contactId: string,
    phoneValue: string,
    scheme: DialScheme,
  ) {
    try {
      await open(`${scheme}:${phoneValue}`);
      await recordCall(contactId, phoneValue);
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not start call",
        message: String(err),
      });
    }
  }

  const filtered = useMemo(() => {
    const base = contacts ?? [];
    if (!searchText) return rankContacts(base, frecency);
    const matches = base.filter((c) => matchesQuery(c, searchText));
    return rankByQueryRelevance(matches, searchText, frecency);
  }, [contacts, frecency, searchText]);

  const autoDialedRef = useRef(false);
  useEffect(() => {
    if (autoDialedRef.current) return;
    if (!initialQuery) return;
    if (isLoading) return;
    if (filtered.length !== 1) return;
    const target = filtered[0];
    const primary = target.phones[0];
    autoDialedRef.current = true;
    (async () => {
      await dial(target.id, primary.value, defaultScheme);
      await popToRoot();
    })();
  }, [initialQuery, isLoading, filtered]);

  const ranked = filtered;

  async function refresh() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing contacts…",
    });
    try {
      await loadContacts(true);
      revalidate();
      setFrecency(await getFrecency());
      toast.style = Toast.Style.Success;
      toast.title = "Contacts refreshed";
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Refresh failed";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search contacts…"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
    >
      {ranked.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.PersonCircle}
          title="No contacts with phone numbers"
          description="Grant Contacts access in System Settings → Privacy & Security → Contacts, then refresh."
          actions={
            <ActionPanel>
              <Action
                title="Refresh Contacts"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
              />
            </ActionPanel>
          }
        />
      ) : (
        ranked.map((c) => {
          const primary = c.phones[0];
          const primaryDisplay = formatDisplay(primary.value);
          const flag = getCountryFlag(primary.value);
          const accessories: List.Item.Accessory[] = [];
          if (flag) accessories.push({ text: flag });
          if (c.phones.length > 1)
            accessories.push({ text: `${c.phones.length} numbers` });
          return (
            <List.Item
              key={c.id}
              icon={Icon.Person}
              title={c.name}
              subtitle={`${primary.label} · ${primaryDisplay}`}
              keywords={c.phones.map((p) => p.value)}
              accessories={accessories.length > 0 ? accessories : undefined}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title={`${ACTION_VERB[defaultScheme]} ${primary.label}`}
                      icon={ACTION_ICON[defaultScheme]}
                      onAction={() => dial(c.id, primary.value, defaultScheme)}
                    />
                  </ActionPanel.Section>
                  {c.phones.length > 1 && (
                    <ActionPanel.Section title="Other numbers">
                      {c.phones.slice(1).map((p, idx) => (
                        <Action
                          key={`${idx}-${p.label}-${p.value}`}
                          title={`${ACTION_VERB[defaultScheme]} ${p.label} · ${formatDisplay(p.value)}`}
                          icon={ACTION_ICON[defaultScheme]}
                          onAction={() => dial(c.id, p.value, defaultScheme)}
                        />
                      ))}
                    </ActionPanel.Section>
                  )}
                  <ActionPanel.Section>
                    {defaultScheme !== "tel" && (
                      <Action
                        title="Call (Phone)"
                        icon={Icon.Phone}
                        shortcut={{ modifiers: ["cmd"], key: "p" }}
                        onAction={() => dial(c.id, primary.value, "tel")}
                      />
                    )}
                    {defaultScheme !== "facetime-audio" && (
                      <Action
                        title="FaceTime Audio"
                        icon={Icon.Microphone}
                        shortcut={{ modifiers: ["cmd"], key: "a" }}
                        onAction={() =>
                          dial(c.id, primary.value, "facetime-audio")
                        }
                      />
                    )}
                    {defaultScheme !== "facetime" && (
                      <Action
                        title="FaceTime Video"
                        icon={Icon.Video}
                        shortcut={{ modifiers: ["cmd"], key: "v" }}
                        onAction={() => dial(c.id, primary.value, "facetime")}
                      />
                    )}
                    <Action.CopyToClipboard
                      title="Copy Number"
                      content={primary.value}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Refresh Contacts"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={refresh}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
