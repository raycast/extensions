import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  Icon,
  popToRoot,
} from "@raycast/api";
import { parseMarkdown } from "./utils/parser";
import { saveCard } from "./utils/storage";
import { Flashcard, Preferences } from "./types";
import { t } from "./utils/i18n";

export default function CreateCard() {
  const { language } = getPreferenceValues<Preferences>();

  async function handleSubmit(values: { markdown: string }) {
    const input = values.markdown?.trim();

    if (!input) {
      await showToast({
        style: Toast.Style.Failure,
        title: t(language, "input.missing.title"),
        message: t(language, "input.missing.msg"),
      });
      return;
    }

    try {
      const parsed = parseMarkdown(input);

      if (!parsed.front) {
        await showToast({
          style: Toast.Style.Failure,
          title: t(language, "front.missing.title"),
          message: t(language, "front.missing.msg"),
        });
        return;
      }

      const card: Flashcard = {
        ...parsed,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        progress: "unanswered",
        createdAt: Date.now(),
      };

      await saveCard(card);
      await showToast({
        style: Toast.Style.Success,
        title: t(language, "save.success"),
        message: `"${card.front}"`,
      });
      // Formular schließen und zurück zur Hauptansicht
      await popToRoot();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: t(language, "parse.error"),
        message: String(e),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t(language, "save.btn")}
            icon={Icon.CheckCircle}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="markdown"
        title={t(language, "card.title")}
        placeholder={t(language, "card.placeholder")}
        info={t(language, "card.info")}
      />
      <Form.Separator />

      {/* ── Standard-Karte: Schritte ── */}
      <Form.Description
        title={t(language, "syntax.ref")}
        text={[
          t(language, "syntax.standard.title"),
          t(language, "syntax.standard.1"),
          t(language, "syntax.standard.2"),
          t(language, "syntax.standard.3"),
          t(language, "syntax.standard.4"),
        ].join("\n")}
      />
      <Form.Description
        title={t(language, "example")}
        text={[
          t(language, "syntax.standard.example.title"),
          "==",
          t(language, "syntax.standard.example.back"),
          "#biology #school",
        ].join("\n")}
      />

      <Form.Separator />

      {/* ── Multiple-Choice: Schritte ── */}
      <Form.Description
        title=""
        text={[
          t(language, "syntax.mc.title"),
          t(language, "syntax.mc.1"),
          t(language, "syntax.mc.2"),
          t(language, "syntax.mc.3"),
          t(language, "syntax.mc.4"),
          t(language, "syntax.mc.5"),
          t(language, "syntax.mc.6"),
        ].join("\n")}
      />
      <Form.Description
        title={t(language, "example")}
        text={[
          t(language, "syntax.mc.example.title"),
          "==<",
          "1: 1945",
          "2: 1957",
          "3: 1993",
          "--",
          `${t(language, "syntax.mc.5").split(":")[0]}: 2`,
          "#history #politics",
        ].join("\n")}
      />

      <Form.Separator />

      {/* ── Tag-Kategorien ── */}
      <Form.Description
        title={t(language, "tag.categories")}
        text={t(language, "syntax.tags.info")}
      />
    </Form>
  );
}
