import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getSavedTimeZones, saveTimeZones } from "./storage";
import { TimeZoneConfig, SUGGESTIONS } from "./config";
import { formatPreviewTime } from "./utils";

// Get all available timezones
const allTimeZones: string[] = (() => {
  try {
    // Using unknown as an intermediate step for type assertion
    const intlWithSupport = Intl as unknown as {
      supportedValuesOf(key: string): string[];
    };
    return intlWithSupport.supportedValuesOf("timeZone");
  } catch (e) {
    // Fallback if supportedValuesOf is not available
    return [
      "America/New_York",
      "America/Los_Angeles",
      "Europe/London",
      "Asia/Tokyo",
      "Asia/Kolkata",
      "Australia/Sydney",
    ];
  }
})();

function EditEmojiForm({
  currentEmoji,
  onSave,
}: {
  timezone?: string;
  currentEmoji: string;
  onSave: (emoji: string) => void;
}) {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Emoji"
            onSubmit={({ emoji }) => onSave(emoji as string)}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="emoji"
        title="Emoji"
        defaultValue={currentEmoji}
        placeholder="Enter a new emoji..."
      />
    </Form>
  );
}

export default function Command() {
  const [savedZones, setSavedZones] = useState<TimeZoneConfig[]>([]);
  const [searchText, setSearchText] = useState("");
  const [editingZone, setEditingZone] = useState<TimeZoneConfig | null>(null);

  useEffect(() => {
    getSavedTimeZones().then(setSavedZones);
  }, []);

  const filteredZones = allTimeZones.filter((tz) =>
    tz.toLowerCase().includes(searchText.toLowerCase()),
  );

  const addTimeZone = async (timezone: string) => {
    // Find suggestion or use first letter
    const suggestion = SUGGESTIONS.find((s) => s.timezone === timezone);
    const nickname =
      suggestion?.nickname ||
      timezone.split("/").pop()?.charAt(0).toUpperCase() ||
      "📍";

    const newZone = { nickname, timezone };
    const updated = [...savedZones, newZone];
    await saveTimeZones(updated);
    setSavedZones(updated);
    await showToast({ title: "Time Zone Added", style: Toast.Style.Success });
  };

  const removeTimeZone = async (timezone: string) => {
    const updated = savedZones.filter((tz) => tz.timezone !== timezone);
    await saveTimeZones(updated);
    setSavedZones(updated);
    await showToast({ title: "Time Zone Removed", style: Toast.Style.Success });
  };

  const updateEmoji = async (timezone: string, newEmoji: string) => {
    const updated = savedZones.map((tz) =>
      tz.timezone === timezone ? { ...tz, nickname: newEmoji } : tz,
    );
    await saveTimeZones(updated);
    setSavedZones(updated);
    setEditingZone(null);
    await showToast({ title: "Emoji Updated", style: Toast.Style.Success });
  };

  if (editingZone) {
    return (
      <EditEmojiForm
        timezone={editingZone.timezone}
        currentEmoji={editingZone.nickname}
        onSave={(emoji) => updateEmoji(editingZone.timezone, emoji)}
      />
    );
  }

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search time zones..."
    >
      <List.Section title="Current Time Zones">
        {savedZones.map((tz) => (
          <List.Item
            key={tz.timezone}
            icon={tz.nickname}
            title={tz.timezone.replace("_", " ")}
            subtitle={formatPreviewTime(tz.timezone)}
            actions={
              <ActionPanel>
                <Action
                  title="Edit Emoji"
                  icon={Icon.Pencil}
                  onAction={() => setEditingZone(tz)}
                />
                <Action
                  title="Remove Time Zone"
                  icon={Icon.Trash}
                  onAction={() => removeTimeZone(tz.timezone)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Suggested Time Zones">
        {SUGGESTIONS.filter(
          (s) => !savedZones.some((z) => z.timezone === s.timezone),
        ).map((s) => (
          <List.Item
            key={s.timezone}
            icon={s.nickname}
            title={s.timezone.replace("_", " ")}
            subtitle={formatPreviewTime(s.timezone)}
            actions={
              <ActionPanel>
                <Action
                  title="Add Time Zone"
                  icon={Icon.Plus}
                  onAction={() => addTimeZone(s.timezone)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="All Time Zones">
        {filteredZones
          .filter(
            (timezone) => !savedZones.some((z) => z.timezone === timezone),
          )
          .filter(
            (timezone) => !SUGGESTIONS.some((s) => s.timezone === timezone),
          )
          .map((timezone) => (
            <List.Item
              key={timezone}
              icon="📍"
              title={timezone.replace("_", " ")}
              subtitle={formatPreviewTime(timezone)}
              actions={
                <ActionPanel>
                  <Action
                    title="Add Time Zone"
                    icon={Icon.Plus}
                    onAction={() => addTimeZone(timezone)}
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}
