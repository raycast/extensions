import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Image,
  environment,
  LocalStorage,
  open,
  getPreferenceValues,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { spawn } from "child_process";
import { useState, useCallback, useMemo, useEffect } from "react";

interface Contact {
  id: string;
  name: string;
  phone: string;
  image?: string;
  frequency?: number;
  lastContacted?: number;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Load cached contacts immediately
  useEffect(() => {
    async function loadCache() {
      try {
        const cached = await LocalStorage.getItem<string>("cached-contacts");
        if (cached) {
          const parsed = JSON.parse(cached) as Contact[];
          setContacts(parsed);
          setLoading(false);
        }
      } catch (e) {
        console.error("Failed to load cache", e);
      }
    }
    loadCache();
  }, []);

  // Background fetch to update contacts
  usePromise(
    async () => {
      const scriptPath = environment.assetsPath + "/search_contacts.swift";

      return new Promise<Contact[]>((resolve) => {
        const child = spawn("swift", [scriptPath]);

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (chunk) => {
          stdout += chunk;
        });

        child.stderr.on("data", (chunk) => {
          stderr += chunk;
        });

        child.on("close", (code) => {
          if (code !== 0) {
            console.error("Swift script failed:", stderr);
            resolve([]);
            return;
          }

          try {
            // Check for permission error
            if (stdout.includes("permission_denied")) {
              setPermissionDenied(true);
              resolve([]);
              return;
            }

            const rawList = JSON.parse(stdout) as Contact[];
            const uniqueMap = new Map<string, Contact>();
            rawList.forEach((c) => {
              const key = `${c.id}|${c.phone}`;
              if (!uniqueMap.has(key)) {
                uniqueMap.set(key, c);
              }
            });
            const freshContacts = Array.from(uniqueMap.values());
            resolve(freshContacts);
          } catch (e) {
            console.error("JSON parse failed", e);
            resolve([]);
          }
        });

        child.on("error", (err) => {
          console.error("Spawn error", err);
          resolve([]);
        });
      });
    },
    [],
    {
      onData: async (freshContacts) => {
        if (permissionDenied) return;

        if (freshContacts.length > 0) {
          setContacts(freshContacts);
          setLoading(false);
          await LocalStorage.setItem("cached-contacts", JSON.stringify(freshContacts));
        }
      },
      onError: (error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to refresh contacts",
          message: error instanceof Error ? error.message : String(error),
        });
      },
    },
  );

  // Load user preferences (frequencies, favorites)
  const { data: userData } = usePromise(
    async (_refresh: number) => {
      void _refresh;
      const [freqString, favString] = await Promise.all([
        LocalStorage.getItem<string>("call-frequencies"),
        LocalStorage.getItem<string>("favorite-contacts"),
      ]);

      return {
        frequencies: (freqString ? JSON.parse(freqString) : {}) as Record<string, unknown>,
        favorites: (favString ? JSON.parse(favString) : []) as string[],
      };
    },
    [refreshKey],
  );

  const filteredContacts = useMemo(() => {
    if (!contacts || !userData) return { favorites: [], recents: [], isSearch: false };

    const { frequencies, favorites } = userData;
    const lowerQuery = searchText.toLowerCase().trim();

    const contactsWithMeta = contacts.map((c) => {
      const entry = frequencies?.[c.id] as { frequency?: number; lastContacted?: number } | number | undefined;
      const freq = typeof entry === "number" ? entry : entry?.frequency || 0;
      const lastContacted = typeof entry === "number" ? 0 : entry?.lastContacted || 0;
      const isFavorite = favorites.includes(c.id);
      return { ...c, frequency: freq, lastContacted, isFavorite };
    });

    // Merge duplicate contacts (Name + Phone)
    const uniqueMap = new Map<string, (typeof contactsWithMeta)[0]>();

    contactsWithMeta.forEach((c) => {
      const cleanPhone = c.phone.replace(/[^\d+]/g, "");
      const key = `${c.name.toLowerCase()}|${cleanPhone}`;

      const existing = uniqueMap.get(key);
      if (!existing) {
        uniqueMap.set(key, c);
      } else {
        // Keep the favorite one if a duplicate exists
        if (c.isFavorite && !existing.isFavorite) {
          uniqueMap.set(key, c);
        }
      }
    });

    const deduped = Array.from(uniqueMap.values());

    // Empty state logic: Split into Favorites and Recents
    if (!lowerQuery) {
      const { hideRecents, recentLimit } = getPreferenceValues<{ hideRecents: boolean; recentLimit: string }>();
      const limit = parseInt(recentLimit) || 20;

      const favs = deduped
        .filter((c) => c.isFavorite)
        .sort((a, b) => {
          // Sort favorites by recency too
          const timeA = a.lastContacted || 0;
          const timeB = b.lastContacted || 0;
          return timeB - timeA;
        });

      const recents = hideRecents
        ? []
        : deduped
            .filter((c) => !c.isFavorite && (c.frequency || 0) > 0)
            .sort((a, b) => {
              const timeA = a.lastContacted || 0;
              const timeB = b.lastContacted || 0;
              if (timeA !== timeB) return timeB - timeA;
              return (b.frequency || 0) - (a.frequency || 0);
            })
            .slice(0, limit);

      return { favorites: favs, recents: recents, isSearch: false };
    }

    // Search Mode
    const matching = deduped.filter((c) => {
      return c.name.toLowerCase().includes(lowerQuery) || c.phone.includes(lowerQuery);
    });

    const getScore = (c: Contact & { isFavorite: boolean }) => {
      const name = c.name.toLowerCase();
      const freq = c.frequency || 0;

      if (name === lowerQuery) return 10000 + freq;
      if (name.startsWith(lowerQuery)) return 5000 + freq;
      if (name.includes(" " + lowerQuery)) return 1000 + freq;

      if (name.includes(lowerQuery)) {
        const priority = lowerQuery.length === 1 ? 10 : 100;
        return priority + freq;
      }

      return freq;
    };

    const sortedSearch = matching.sort((a, b) => {
      const scoreA = getScore(a);
      const scoreB = getScore(b);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return a.name.localeCompare(b.name);
    });

    return { favorites: [], recents: sortedSearch, isSearch: true };
  }, [contacts, userData, searchText]);

  const handleCall = useCallback(async (contact: Contact) => {
    try {
      const stored = await LocalStorage.getItem<string>("call-frequencies");
      const current = stored ? JSON.parse(stored) : {};

      const existing = current[contact.id];
      const count = (typeof existing === "number" ? existing : existing?.frequency || 0) + 1;

      current[contact.id] = {
        ...contact,
        frequency: count,
        lastContacted: Date.now(), // Store timestamp!
      };

      await LocalStorage.setItem("call-frequencies", JSON.stringify(current));
      setRefreshKey((prev) => prev + 1);
    } catch (e) {
      console.error("Failed to save frequency", e);
    }
  }, []);

  const toggleFavorite = useCallback(async (contact: Contact) => {
    try {
      const stored = await LocalStorage.getItem<string>("favorite-contacts");
      let favorites: string[] = stored ? JSON.parse(stored) : [];

      const isFav = favorites.includes(contact.id);
      if (isFav) {
        favorites = favorites.filter((id) => id !== contact.id);
        await showToast({ title: "Removed from Favorites", style: Toast.Style.Success });
      } else {
        favorites.push(contact.id);
        await showToast({ title: "Added to Favorites", style: Toast.Style.Success });
      }

      await LocalStorage.setItem("favorite-contacts", JSON.stringify(favorites));
      setRefreshKey((prev) => prev + 1);
    } catch (e) {
      console.error("Failed to toggle favorite", e);
      await showToast({ title: "Failed to update favorites", style: Toast.Style.Failure });
    }
  }, []);

  if (permissionDenied) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.Shield, tintColor: "#FF4500" }}
          title="Permission Denied"
          description="Please allow Raycast to access your Contacts in System Settings."
          actions={
            <ActionPanel>
              <Action
                title="Open Privacy Settings"
                onAction={() => open("x-apple.systempreferences:com.apple.preference.security?Privacy_Contacts")}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const { favorites, recents, isSearch } = filteredContacts as {
    favorites: (Contact & { isFavorite: boolean })[];
    recents: (Contact & { isFavorite: boolean })[];
    isSearch: boolean;
  };

  return (
    <List
      isLoading={loading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search contacts (instant)..."
      throttle={false} // Disable throttle for liquid-fast filtering!
    >
      {/* Search Result Mode */}
      {isSearch && (
        <List.Section title="Results">
          {recents.map((contact, index) => (
            <ContactItem
              key={`search-${contact.id}-${index}`}
              contact={contact}
              onCall={handleCall}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </List.Section>
      )}

      {/* Empty State Mode */}
      {!isSearch && (
        <>
          {favorites.length > 0 && (
            <List.Section title="Favorites">
              {favorites.map((contact, index) => (
                <ContactItem
                  key={`fav-${contact.id}-${index}`}
                  contact={contact}
                  onCall={handleCall}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </List.Section>
          )}

          {recents.length > 0 && (
            <List.Section title="Recents">
              {recents.map((contact, index) => (
                <ContactItem
                  key={`recent-${contact.id}-${index}`}
                  contact={contact}
                  onCall={handleCall}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

function ContactItem({
  contact,
  onCall,
  onToggleFavorite,
}: {
  contact: Contact & { isFavorite: boolean };
  onCall: (c: Contact) => Promise<void>;
  onToggleFavorite: (c: Contact) => Promise<void>;
}) {
  return (
    <List.Item
      title={contact.name}
      subtitle={contact.phone}
      icon={contact.image ? { source: contact.image, mask: Image.Mask.Circle } : Icon.Phone}
      accessories={[
        {
          icon: contact.isFavorite ? "⭐️" : Icon.Star,
          tooltip: contact.isFavorite ? "Favorited" : "Add to Favorites",
        },
      ]}
      actions={
        <ActionPanel>
          <Action
            title="Call"
            icon={{ source: Icon.Phone, tintColor: "#127A33" }} // Darker Green
            onAction={async () => {
              await onCall(contact);
              await open(`tel://${contact.phone.replace(/\s/g, "")}`);
            }}
          />
          <Action
            title={contact.isFavorite ? "Unfavorite" : "Favorite"}
            icon={contact.isFavorite ? Icon.StarDisabled : "⭐️"}
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            onAction={() => onToggleFavorite(contact)}
          />
          <Action
            title="Priority Call"
            icon={{ source: Icon.PhoneRinging, tintColor: "#FF4500" }} // Red/Orange for urgency
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            onAction={async () => {
              const preference = getPreferenceValues<{ priorityMessage: string }>();
              const priorityMessage = preference.priorityMessage || "Urgent: Please pick up! 🚨";

              await onCall(contact); // Log frequency

              // Clean phone number
              const cleanPhone = contact.phone.replace(/\s/g, "");
              const body = encodeURIComponent(priorityMessage);

              // 1. Open SMS Draft (so it's ready)
              await open(`sms:${cleanPhone}&body=${body}`);

              // 2. Start Call (immedately after)
              // We add a tiny delay to ensure the OS registers the first open command separately if needed,
              // but standard await open() usually handles the hand-off.
              await open(`tel://${cleanPhone}`);
            }}
          />
          <Action
            title="FaceTime Audio"
            icon={{ source: Icon.Phone, tintColor: "#34C759" }} // FaceTime Green
            onAction={async () => {
              await onCall(contact);
              await open(`facetime-audio://${contact.phone.replace(/\s/g, "")}`);
            }}
          />
          <Action
            title="FaceTime Video"
            icon={{ source: Icon.Video, tintColor: "#34C759" }} // FaceTime Green
            onAction={async () => {
              await onCall(contact);
              await open(`facetime://${contact.phone.replace(/\s/g, "")}`);
            }}
          />
          <Action
            title="Message"
            icon={{ source: Icon.Message, tintColor: "#34C759" }} // Green Message
            onAction={async () => {
              await onCall(contact); // Log as interaction
              await open(`sms:${contact.phone.replace(/\s/g, "")}`);
            }}
          />
          <Action
            title="WhatsApp Message"
            icon={{ source: `${environment.assetsPath}/whatsapp.svg` }}
            onAction={async () => {
              await onCall(contact);
              const cleanPhone = contact.phone.replace(/[^\d]/g, "");
              await open(`whatsapp://send?phone=${cleanPhone}`);
            }}
          />
          <Action.CopyToClipboard
            title="Copy Phone Number"
            content={contact.phone}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
