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
import { useState } from "react";
import { Flashcard, Preferences } from "./types";
import { parseMultipleCards } from "./utils/parser";
import { saveCard } from "./utils/storage";
import { t } from "./utils/i18n";
import { readFileSync } from "fs";

export default function ImportCards() {
  const { language } = getPreferenceValues<Preferences>();
  const [mode, setMode] = useState<string>("paste");

  async function handleSubmit(values: {
    markdown?: string;
    filePath?: string[];
  }) {
    let input = "";

    if (mode === "paste") {
      // Markdown-Text wurde direkt eingefügt
      input = values.markdown?.trim() ?? "";
    } else {
      // Datei einlesen
      const path = values.filePath?.[0];
      if (!path) {
        await showToast({
          style: Toast.Style.Failure,
          title: t(language, "import.error"),
          message: t(language, "import.empty"),
        });
        return;
      }
      try {
        input = readFileSync(path, "utf-8").trim();
      } catch (e) {
        await showToast({
          style: Toast.Style.Failure,
          title: t(language, "import.error"),
          message: String(e),
        });
        return;
      }
    }

    if (!input) {
      await showToast({
        style: Toast.Style.Failure,
        title: t(language, "import.error"),
        message: t(language, "import.empty"),
      });
      return;
    }

    try {
      const parsed = parseMultipleCards(input);

      if (parsed.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: t(language, "import.error"),
          message: t(language, "import.empty"),
        });
        return;
      }

      // Alle geparsten Karten speichern
      let savedCount = 0;
      for (const p of parsed) {
        // Nur Karten mit Vorderseite speichern
        if (!p.front) continue;

        const card: Flashcard = {
          ...p,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          progress: "unanswered",
          createdAt: Date.now(),
        };
        await saveCard(card);
        savedCount++;
      }

      await showToast({
        style: Toast.Style.Success,
        title: t(language, "import.success"),
        message: t(language, "import.count").replace("{n}", String(savedCount)),
      });

      await popToRoot();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: t(language, "import.error"),
        message: String(e),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t(language, "import.btn")}
            icon={Icon.Download}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      {/* Import-Modus Auswahl */}
      <Form.Dropdown
        id="mode"
        title={t(language, "import.mode")}
        value={mode}
        onChange={setMode}
      >
        <Form.Dropdown.Item
          value="paste"
          title={t(language, "import.mode.paste")}
          icon={Icon.TextCursor}
        />
        <Form.Dropdown.Item
          value="file"
          title={t(language, "import.mode.file")}
          icon={Icon.Document}
        />
      </Form.Dropdown>

      <Form.Separator />

      {mode === "paste" ? (
        <Form.TextArea
          id="markdown"
          title={t(language, "import.paste.title")}
          placeholder={t(language, "import.paste.placeholder")}
          info={t(language, "import.paste.info")}
        />
      ) : (
        <Form.FilePicker
          id="filePath"
          title={t(language, "import.file.title")}
          allowMultipleSelection={false}
          canChooseDirectories={false}
          canChooseFiles={true}
        />
      )}

      <Form.Separator />

      {/* Format-Referenz */}
      <Form.Description
        title={t(language, "syntax.ref")}
        text={[
          `── ${t(language, "standard")} ──`,
          `${t(language, "syntax.standard.example.title")}`,
          "==",
          `${t(language, "syntax.standard.example.back")}`,
          "#biology #school",
          "---",
          "",
          `── ${t(language, "mc")} ──`,
          `${t(language, "syntax.mc.example.title")}`,
          "==<",
          "1: 1945",
          "2: 1957",
          "3: 1993",
          "--",
          `${t(language, "syntax.mc.5").split(":")[0]}: 2`,
          "#history #politics",
        ].join("\n")}
      />
    </Form>
  );
}
