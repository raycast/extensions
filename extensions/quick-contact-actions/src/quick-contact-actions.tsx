import {
  Action,
  ActionPanel,
  Cache,
  Color,
  environment,
  Icon,
  Image,
  List,
  LocalStorage,
  useNavigation,
} from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { execFile } from "child_process";
import { join } from "path";
import { useEffect, useRef, useState } from "react";

interface ContactValue {
  label: string;
  value: string;
}

interface Contact {
  id: string;
  name: string;
  phones: ContactValue[];
  emails: ContactValue[];
  imagePath?: string;
  circleImagePath?: string;
  organization?: string;
}

// Uses a bundled Swift script that calls CNContactStore directly.
// This uses the native Contacts permission (no Automation permission needed).
async function fetchContacts(): Promise<Contact[]> {
  const binaryPath = join(environment.assetsPath, "get-contacts");
  const imageDir = join(environment.supportPath, "avatars");
  const json = await new Promise<string>((resolve, reject) => {
    execFile(binaryPath, [imageDir], { timeout: 10000 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout);
    });
  });
  return JSON.parse(json) as Contact[];
}

function ContactActions({ contact }: { contact: Contact }) {
  const { phones, emails } = contact;

  return (
    <List navigationTitle={contact.name} searchBarPlaceholder="Filter actions…">
      {(phones.length > 0 || emails.length > 0) && (
        <List.Section title="FaceTime Video">
          {phones.map((p, i) => (
            <List.Item
              key={`video-p-${i}`}
              title={p.label}
              subtitle={p.value}
              icon={{ source: Icon.Video, tintColor: Color.Green }}
              actions={
                <ActionPanel>
                  <Action.Open
                    title="Start FaceTime Video"
                    icon={Icon.Video}
                    target={`facetime://${p.value.replace(/\s/g, "")}`}
                  />
                  <Action.CopyToClipboard title="Copy Number" content={p.value} />
                </ActionPanel>
              }
            />
          ))}
          {emails.map((e, i) => (
            <List.Item
              key={`video-e-${i}`}
              title={e.label}
              subtitle={e.value}
              icon={{ source: Icon.Envelope, tintColor: Color.Green }}
              actions={
                <ActionPanel>
                  <Action.Open title="Start FaceTime Video" icon={Icon.Video} target={`facetime://${e.value}`} />
                  <Action.CopyToClipboard title="Copy Email" content={e.value} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {(phones.length > 0 || emails.length > 0) && (
        <List.Section title="FaceTime Audio">
          {phones.map((p, i) => (
            <List.Item
              key={`audio-p-${i}`}
              title={p.label}
              subtitle={p.value}
              icon={{ source: Icon.Phone, tintColor: Color.Green }}
              actions={
                <ActionPanel>
                  <Action.Open
                    title="Start FaceTime Audio"
                    icon={Icon.Phone}
                    target={`facetime-audio://${p.value.replace(/\s/g, "")}`}
                  />
                  <Action.CopyToClipboard title="Copy Number" content={p.value} />
                </ActionPanel>
              }
            />
          ))}
          {emails.map((e, i) => (
            <List.Item
              key={`audio-e-${i}`}
              title={e.label}
              subtitle={e.value}
              icon={{ source: Icon.Envelope, tintColor: Color.Green }}
              actions={
                <ActionPanel>
                  <Action.Open title="Start FaceTime Audio" icon={Icon.Phone} target={`facetime-audio://${e.value}`} />
                  <Action.CopyToClipboard title="Copy Email" content={e.value} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {phones.length > 0 && (
        <List.Section title="Phone">
          {phones.map((p, i) => (
            <List.Item
              key={`call-${i}`}
              title={p.label}
              subtitle={p.value}
              icon={{ source: Icon.Mobile, tintColor: Color.Orange }}
              actions={
                <ActionPanel>
                  <Action.Open title="Call" icon={Icon.Mobile} target={`tel:${p.value.replace(/[^+\d]/g, "")}`} />
                  <Action.CopyToClipboard title="Copy Number" content={p.value} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {phones.length > 0 && (
        <List.Section title="Message">
          {phones.map((p, i) => (
            <List.Item
              key={`sms-${i}`}
              title={p.label}
              subtitle={p.value}
              icon={{ source: Icon.Message, tintColor: Color.Blue }}
              actions={
                <ActionPanel>
                  <Action.Open
                    title="Send Message"
                    icon={Icon.Message}
                    target={`sms:${p.value.replace(/[^+\d]/g, "")}`}
                  />
                  <Action.CopyToClipboard title="Copy Number" content={p.value} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {phones.length > 0 && (
        <List.Section title="WhatsApp">
          {phones.map((p, i) => (
            <List.Item
              key={`whatsapp-${i}`}
              title={p.label}
              subtitle={p.value}
              icon={{ source: Icon.Message, tintColor: Color.Green }}
              actions={
                <ActionPanel>
                  <Action.Open
                    title="Send WhatsApp Message"
                    icon={{ source: Icon.Message, tintColor: Color.Green }}
                    target={`whatsapp://send?phone=${p.value.replace(/[^+\d]/g, "")}`}
                  />
                  <Action.Open
                    title="WhatsApp Audio Call"
                    icon={{ source: Icon.Phone, tintColor: Color.Green }}
                    target={`whatsapp://send?phone=${p.value.replace(/[^+\d]/g, "")}`}
                  />
                  <Action.Open
                    title="WhatsApp Video Call"
                    icon={{ source: Icon.Video, tintColor: Color.Green }}
                    target={`whatsapp://send?phone=${p.value.replace(/[^+\d]/g, "")}`}
                  />
                  <Action.CopyToClipboard title="Copy Number" content={p.value} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {emails.length > 0 && (
        <List.Section title="Email">
          {emails.map((e, i) => (
            <List.Item
              key={`email-${i}`}
              title={e.label}
              subtitle={e.value}
              icon={{ source: Icon.Envelope, tintColor: Color.Purple }}
              actions={
                <ActionPanel>
                  <Action.Open title="Send Email" icon={Icon.Envelope} target={`mailto:${e.value}`} />
                  <Action.CopyToClipboard title="Copy Email" content={e.value} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

const cache = new Cache();
const CACHE_KEY = "contacts";

function contactSubtitle(contact: Contact): string {
  if (contact.phones.length > 0) return contact.phones[0].value;
  if (contact.emails.length > 0) return contact.emails[0].value;
  return "";
}

function getInitialsSvg(name: string): string {
  const words = name.split(" ").filter(Boolean);
  const initials = words.length >= 2 ? (words[0][0] + words[1][0]).toUpperCase() : (words[0]?.[0] ?? "?").toUpperCase();
  const colors = ["#FF6363", "#4A90D9", "#50C878", "#FF8C00", "#9B59B6", "#E91E8E", "#2AA198", "#5856D6"];
  const hash = [...name].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0);
  const bg = colors[Math.abs(hash) % colors.length];
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="80">`,
    `<circle cx="150" cy="40" r="40" fill="${bg}"/>`,
    `<text x="150" y="56" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="32" font-weight="500" fill="white">${initials}</text>`,
    `</svg>`,
  ].join("");
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function getNameSvg(name: string, org?: string): string {
  const escapedName = name.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const hasOrg = org && org.length > 0;
  const escapedOrg = hasOrg ? org.replace(/&/g, "&amp;").replace(/</g, "&lt;") : "";
  const nameY = 16;
  const orgY = nameY + 22;
  const height = hasOrg ? orgY + 10 : nameY + 8;
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="${height}">`,
    `<text x="150" y="${nameY}" text-anchor="middle" dy="0.35em" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="16" font-weight="600" fill="white">${escapedName}</text>`,
    hasOrg
      ? `<text x="150" y="${orgY}" text-anchor="middle" dy="0.35em" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="13" font-weight="400" fill="#999">${escapedOrg}</text>`
      : "",
    `</svg>`,
  ].join("");
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

const FREQ_KEY = "contact-frequency";
const FAVS_KEY = "contact-favorites";

async function getFavorites(): Promise<Set<string>> {
  const raw = await LocalStorage.getItem<string>(FAVS_KEY);
  if (!raw) return new Set();
  try {
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

async function toggleFavorite(contactId: string): Promise<Set<string>> {
  const favs = await getFavorites();
  if (favs.has(contactId)) favs.delete(contactId);
  else favs.add(contactId);
  await LocalStorage.setItem(FAVS_KEY, JSON.stringify([...favs]));
  return favs;
}

async function getFrequency(): Promise<Record<string, number>> {
  const raw = await LocalStorage.getItem<string>(FREQ_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function incrementFrequency(contactId: string): Promise<void> {
  const freq = await getFrequency();
  freq[contactId] = (freq[contactId] ?? 0) + 1;
  await LocalStorage.setItem(FREQ_KEY, JSON.stringify(freq));
}

export default function Command(props: { arguments: { contact?: string } }) {
  const contactArg = props.arguments.contact?.trim() ?? "";
  const [searchText, setSearchText] = useState(contactArg);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [showDetail, setShowDetail] = useState(false);
  const [frequency, setFrequency] = useState<Record<string, number>>({});
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const { push } = useNavigation();
  const didAutoNav = useRef(false);

  useEffect(() => {
    const freqPromise = getFrequency();
    const favsPromise = getFavorites();

    const cached = cache.get(CACHE_KEY);
    if (cached) {
      try {
        const parsedContacts = JSON.parse(cached);
        if (!Array.isArray(parsedContacts)) throw new Error("invalid cache");
        Promise.all([freqPromise, favsPromise]).then(([freq, favs]) => {
          setFrequency(freq);
          setFavorites(favs);
          setContacts(parsedContacts);
          setIsLoading(false);
        });
      } catch {
        cache.remove(CACHE_KEY);
        Promise.all([freqPromise, favsPromise]).then(([freq, favs]) => {
          setFrequency(freq);
          setFavorites(favs);
        });
      }
    } else {
      Promise.all([freqPromise, favsPromise]).then(([freq, favs]) => {
        setFrequency(freq);
        setFavorites(favs);
      });
    }

    fetchContacts()
      .then((fresh) => {
        setContacts(fresh);
        cache.set(CACHE_KEY, JSON.stringify(fresh));
      })
      .catch((e: Error) => setError(e.message ?? "Failed to load contacts"))
      .finally(() => setIsLoading(false));
  }, []);

  // Auto-navigate when argument provided and exactly one contact matches
  useEffect(() => {
    if (!isLoading && contactArg && !didAutoNav.current) {
      const matches = contacts.filter((c) => c.name.toLowerCase().includes(contactArg.toLowerCase()));
      if (matches.length === 1) {
        didAutoNav.current = true;
        push(<ContactActions contact={matches[0]} />);
      }
    }
  }, [isLoading, contacts]);

  // When searchText is controlled, Raycast disables built-in filtering — filter and rank manually.
  // Score: 3 = exact name, 2 = name starts with, 1 = word starts with, 0 = name substring, -1 = phone/email match.
  const displayedContacts = searchText
    ? contacts
        .flatMap((c) => {
          const lower = c.name.toLowerCase();
          const q = searchText.toLowerCase();
          let score: number;
          if (lower === q) score = 3;
          else if (lower.startsWith(q)) score = 2;
          else if (lower.split(" ").some((w) => w.startsWith(q))) score = 1;
          else if (lower.includes(q)) score = 0;
          else {
            const qDigits = q.replace(/\D/g, "");
            if (qDigits.length >= 3 && c.phones.some((p) => p.value.replace(/\D/g, "").includes(qDigits))) score = -1;
            else if (c.emails.some((e) => e.value.toLowerCase().includes(q))) score = -1;
            else return [];
          }
          return [{ contact: c, score }];
        })
        .sort((a, b) => b.score - a.score)
        .map(({ contact }) => contact)
    : contacts;

  const favoriteContacts = !searchText
    ? [...displayedContacts].filter((c) => favorites.has(c.id)).sort((a, b) => a.name.localeCompare(b.name))
    : [];
  const favoriteIds = new Set(favoriteContacts.map((c) => c.id));
  const frequentContacts = !searchText
    ? [...displayedContacts]
        .filter((c) => (frequency[c.id] ?? 0) > 0 && !favoriteIds.has(c.id))
        .sort((a, b) => (frequency[b.id] ?? 0) - (frequency[a.id] ?? 0))
        .slice(0, 5)
    : [];
  const frequentIds = new Set(frequentContacts.map((c) => c.id));
  const remainingContacts = displayedContacts.filter((c) => !favoriteIds.has(c.id) && !frequentIds.has(c.id));

  function renderContactItem(contact: Contact) {
    return (
      <List.Item
        key={contact.id}
        title={contact.name}
        subtitle={!showDetail ? contactSubtitle(contact) : undefined}
        icon={contact.imagePath ? { source: contact.imagePath, mask: Image.Mask.Circle } : getAvatarIcon(contact.name)}
        accessories={
          !showDetail
            ? [
                ...(contact.phones.length > 0
                  ? [{ icon: Icon.Phone, tooltip: `${contact.phones.length} phone(s)` }]
                  : []),
                ...(contact.emails.length > 0
                  ? [{ icon: Icon.Envelope, tooltip: `${contact.emails.length} email(s)` }]
                  : []),
              ]
            : undefined
        }
        detail={
          <List.Item.Detail
            markdown={(() => {
              const avatarImg = contact.circleImagePath
                ? `file://${encodeURI(contact.circleImagePath)}?raycast-width=80&raycast-height=80`
                : getInitialsSvg(contact.name);
              const nameSvg = getNameSvg(contact.name, contact.organization);
              return `![](${avatarImg})\n\n![](${nameSvg})`;
            })()}
            metadata={
              <List.Item.Detail.Metadata>
                {contact.phones.map((phone, i) => (
                  <List.Item.Detail.Metadata.Label
                    key={`phone-${i}`}
                    title={phone.label}
                    text={phone.value}
                    icon={{ source: Icon.Phone, tintColor: Color.Orange }}
                  />
                ))}
                {contact.phones.length > 0 && contact.emails.length > 0 && <List.Item.Detail.Metadata.Separator />}
                {contact.emails.map((email, i) => (
                  <List.Item.Detail.Metadata.Label
                    key={`email-${i}`}
                    title={email.label}
                    text={email.value}
                    icon={{ source: Icon.Envelope, tintColor: Color.Purple }}
                  />
                ))}
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action
                title="Show Actions"
                icon={Icon.ChevronRight}
                onAction={() => {
                  incrementFrequency(contact.id);
                  setFrequency((prev) => ({ ...prev, [contact.id]: (prev[contact.id] ?? 0) + 1 }));
                  push(<ContactActions contact={contact} />);
                }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section title="Quick Actions">
              {contact.phones.length > 0 && (
                <Action.Open
                  title="FaceTime Video"
                  icon={Icon.Video}
                  target={`facetime://${contact.phones[0].value.replace(/\s/g, "")}`}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                />
              )}
              {contact.phones.length > 0 && (
                <Action.Open
                  title="FaceTime Audio"
                  icon={Icon.Phone}
                  target={`facetime-audio://${contact.phones[0].value.replace(/\s/g, "")}`}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                />
              )}
              {contact.phones.length > 0 && (
                <Action.Open
                  title="Call"
                  icon={Icon.Mobile}
                  target={`tel:${contact.phones[0].value.replace(/[^+\d]/g, "")}`}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              )}
              {contact.phones.length > 0 && (
                <Action.Open
                  title="Send Message"
                  icon={Icon.Message}
                  target={`sms:${contact.phones[0].value.replace(/[^+\d]/g, "")}`}
                  shortcut={{ modifiers: ["cmd"], key: "m" }}
                />
              )}
              {contact.phones.length > 0 && (
                <Action.Open
                  title="WhatsApp"
                  icon={{ source: Icon.Message, tintColor: Color.Green }}
                  target={`whatsapp://send?phone=${contact.phones[0].value.replace(/[^+\d]/g, "")}`}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
                />
              )}
              {contact.emails.length > 0 && (
                <Action.Open
                  title="Send Email"
                  icon={Icon.Envelope}
                  target={`mailto:${contact.emails[0].value}`}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                />
              )}
            </ActionPanel.Section>
            <ActionPanel.Section title="Contacts App">
              <Action
                title="Open in Contacts"
                icon={Icon.PersonCircle}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
                onAction={() => {
                  execFile(
                    join(environment.assetsPath, "get-contacts"),
                    ["--open", contact.id],
                    { timeout: 5000 },
                    () => {},
                  );
                }}
              />
              <Action
                title="Edit in Contacts"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                onAction={() => {
                  execFile(
                    join(environment.assetsPath, "get-contacts"),
                    ["--edit", contact.id],
                    { timeout: 5000 },
                    () => {},
                  );
                }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section title="Copy">
              <Action.CopyToClipboard
                title="Copy Name"
                content={contact.name}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
              {contact.phones.length > 0 && (
                <Action.CopyToClipboard
                  title="Copy Phone Number"
                  content={contact.phones[0].value}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                />
              )}
              {contact.emails.length > 0 && (
                <Action.CopyToClipboard
                  title="Copy Email"
                  content={contact.emails[0].value}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                />
              )}
            </ActionPanel.Section>
            <ActionPanel.Section title="View">
              <Action
                title="Toggle Detail"
                icon={Icon.Sidebar}
                onAction={() => setShowDetail((prev) => !prev)}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
              <Action
                title={favorites.has(contact.id) ? "Remove from Favorites" : "Add to Favorites"}
                icon={Icon.Star}
                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                onAction={async () => {
                  const updated = await toggleFavorite(contact.id);
                  setFavorites(new Set(updated));
                }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search contacts…"
      isShowingDetail={showDetail}
    >
      {error ? (
        <List.EmptyView title="Could not load contacts" description={error} icon={Icon.Warning} />
      ) : displayedContacts.length === 0 && !isLoading ? (
        <List.EmptyView title="No contacts found" icon={Icon.MagnifyingGlass} />
      ) : (
        <>
          {!searchText && favoriteContacts.length > 0 && (
            <List.Section title="Favorites">
              {favoriteContacts.map((contact) => renderContactItem(contact))}
            </List.Section>
          )}
          {!searchText && frequentContacts.length > 0 && (
            <List.Section title="Frequently Contacted">
              {frequentContacts.map((contact) => renderContactItem(contact))}
            </List.Section>
          )}
          {searchText
            ? displayedContacts.map((contact) => renderContactItem(contact))
            : Object.entries(
                remainingContacts.reduce<Record<string, Contact[]>>((acc, c) => {
                  const first = c.name[0]?.toUpperCase() || "#";
                  const letter = first >= "A" && first <= "Z" ? first : "#";
                  (acc[letter] ??= []).push(c);
                  return acc;
                }, {}),
              ).map(([letter, group]) => (
                <List.Section key={letter} title={letter}>
                  {group.map((contact) => renderContactItem(contact))}
                </List.Section>
              ))}
        </>
      )}
    </List>
  );
}
