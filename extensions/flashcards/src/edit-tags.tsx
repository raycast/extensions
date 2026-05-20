import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  Icon,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { Flashcard, Preferences } from "./types";
import { saveCard, getAllTags } from "./utils/storage";
import { t } from "./utils/i18n";

interface Props {
  card: Flashcard;
  /** Wird nach dem Speichern aufgerufen, um die Elternliste zu aktualisieren. */
  onSaved?: () => void;
}

export default function EditTags({ card, onSaved }: Props) {
  const { language } = getPreferenceValues<Preferences>();
  const { pop } = useNavigation();

  // Tags mit # vorformatiert als Standardwert anzeigen
  const [tagInput, setTagInput] = useState(
    card.tags.map((tg) => `#${tg}`).join(" "),
  );
  const [existingTags, setExistingTags] = useState<string[]>([]);

  // Bereits verwendete Tags aus dem Storage laden (als Vorschläge)
  useEffect(() => {
    getAllTags().then(setExistingTags);
  }, []);

  // Hilfetext: bereits verwendete Tags anzeigen
  const suggestionsText =
    existingTags.length > 0
      ? t(language, "already.used") +
        existingTags.map((tg) => `#${tg}`).join("  ")
      : t(language, "no.tags.created");

  async function handleSubmit(values: { tags: string }) {
    // Tags aus der Eingabe parsen – Leerzeichen- oder Komma-getrennt, mit oder ohne #
    // Normalisierung: Kleinschreibung + Duplikate entfernen
    const raw = values.tags.trim();
    const parsed: string[] =
      raw.length === 0
        ? []
        : [
            ...new Set(
              raw
                .split(/[\s,]+/)
                .map((tg) => tg.replace(/^#/, "").trim().toLowerCase())
                .filter(Boolean),
            ),
          ];

    const updated: Flashcard = { ...card, tags: parsed };

    try {
      await saveCard(updated);
      await showToast({
        style: Toast.Style.Success,
        title: t(language, "tags.saved"),
        message:
          parsed.length === 0
            ? t(language, "all.tags.removed")
            : parsed.map((tg) => `#${tg}`).join(" "),
      });
      onSaved?.();
      pop();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: t(language, "error.saving"),
        message: String(e),
      });
    }
  }

  return (
    <Form
      navigationTitle={t(language, "edit.tags") + ` – ${card.front}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t(language, "tags.saved").replace("!", "")}
            icon={Icon.CheckCircle}
            onSubmit={handleSubmit}
          />
          <Action
            title={t(language, "cancel")}
            icon={Icon.XMarkCircle}
            shortcut={{ modifiers: ["cmd"], key: "." }}
            onAction={pop}
          />
        </ActionPanel>
      }
    >
      {/* Karten-Vorschau */}
      <Form.Description title={t(language, "card.title")} text={card.front} />
      <Form.Separator />

      {/* Tag-Eingabe */}
      <Form.TextField
        id="tags"
        title={t(language, "tags")}
        placeholder="#vokabel #grammatik #unternehmen"
        value={tagInput}
        onChange={setTagInput}
        info={t(language, "tags.input.info")}
      />

      {/* Vorhandene Tags als Hilfe anzeigen */}
      <Form.Description
        title={t(language, "existing.tags")}
        text={suggestionsText}
      />

      <Form.Separator />

      {/* Hinweise zur Syntax */}
      <Form.Description
        title={t(language, "tips")}
        text={t(language, "tips.text")}
      />
    </Form>
  );
}
