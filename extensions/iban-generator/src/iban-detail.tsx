import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Icon,
  Keyboard,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useState } from "react";
import { generateRecord, toSavedIban } from "./generate-record";
import { type FormPrefs } from "./form-prefs";
import { checkIban } from "./lib";
import { ibanValidationLabel } from "./iban-issue-labels";
import { copyBicShortcut, generateAnotherShortcut } from "./shortcuts";
import { ibanText, saveIban, type SavedIban } from "./storage";
import { invalidKindDescription, invalidKindTitle, type ValidityChoice } from "./validity";

interface IbanDetailProps {
  record: SavedIban;
  prefs: FormPrefs;
  validity: ValidityChoice;
  onSaved?: (record: SavedIban) => void;
  onBackToSettings?: () => void;
}

function tinted(icon: Icon, color: Color): { source: Icon; tintColor: Color } {
  return { source: icon, tintColor: color };
}

function displayIban(record: SavedIban): string {
  return record.format === "grouped" ? record.formatted : record.iban;
}

function buildMarkdown(record: SavedIban): string {
  const ibanLine = displayIban(record);
  const lines = [`# ${record.flag} ${record.countryName}`];

  const subtitleParts: string[] = [];
  if (record.note) {
    subtitleParts.push(record.note);
  }
  if (record.bankName) {
    subtitleParts.push(record.bankName);
  }
  if (record.bic) {
    subtitleParts.push(record.bic);
  }
  if (subtitleParts.length > 0) {
    lines.push("", subtitleParts.join(" · "));
  }

  lines.push("", `\`\`\`\n${ibanLine}\n\`\`\``);

  if (record.invalidKind) {
    lines.push(
      "",
      `> **Intentionally invalid:** ${invalidKindTitle(record.invalidKind)} — ${invalidKindDescription(record.invalidKind)}`,
    );
  }

  lines.push(
    "",
    "> Generated test data for development and testing — not linked to a real bank account.",
    "",
    "## Breakdown",
    "",
    `| Part | Value |`,
    `| --- | --- |`,
    `| Country code | \`${record.countryCode}\` |`,
    `| Check digits | \`${record.checkDigits}\` |`,
    `| Bank code | \`${record.bankCode}\` |`,
  );

  if (record.branchCode) {
    lines.push(`| Branch code | \`${record.branchCode}\` |`);
  }

  lines.push(`| Account number | \`${record.accountNumber}\` |`);

  return lines.join("\n");
}

function formatSavedAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function IbanDetail({
  record: initialRecord,
  prefs,
  validity: initialValidity,
  onSaved,
  onBackToSettings,
}: IbanDetailProps) {
  const { pop } = useNavigation();
  const [record, setRecord] = useState(initialRecord);
  const [validity] = useState<ValidityChoice>(initialValidity);

  const text = ibanText(record);
  const ibanIssue = checkIban(record.iban);
  const validationLabel = ibanValidationLabel(ibanIssue);
  const validationColor = (() => {
    if (ibanIssue === undefined) {
      return Color.Green;
    }
    if (record.invalidKind) {
      return Color.Red;
    }
    if (ibanIssue === "national-check" && record.note) {
      return Color.Orange;
    }
    return Color.Red;
  })();

  const regenerate = useCallback(async () => {
    try {
      const generated = generateRecord(prefs, validity);
      const saved = toSavedIban(generated, prefs.format);
      await saveIban(saved);
      setRecord(saved);
      onSaved?.(saved);
      if (prefs.copyToClipboard) {
        await Clipboard.copy(ibanText(saved));
      }
      await showToast({ style: Toast.Style.Success, title: "IBAN generated" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not generate IBAN";
      await showToast({ style: Toast.Style.Failure, title: "Generation failed", message });
    }
  }, [onSaved, prefs, validity]);

  const backToSettings = useCallback(() => {
    if (onBackToSettings) {
      onBackToSettings();
    } else {
      pop();
    }
  }, [onBackToSettings, pop]);

  return (
    <Detail
      navigationTitle={onBackToSettings ? undefined : "Generated IBAN"}
      markdown={buildMarkdown(record)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Country"
            text={`${record.flag} ${record.countryName}`}
            icon={tinted(Icon.Globe, Color.Blue)}
          />
          {record.note ? (
            <Detail.Metadata.Label title="Source" text={record.note} icon={tinted(Icon.Tag, Color.Purple)} />
          ) : null}
          {record.bankName ? (
            <Detail.Metadata.Label title="Bank" text={record.bankName} icon={tinted(Icon.Building, Color.Blue)} />
          ) : null}
          {record.bic ? (
            <Detail.Metadata.Label title="BIC" text={record.bic} icon={tinted(Icon.CreditCard, Color.Purple)} />
          ) : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Bank code"
            text={record.bankCode}
            icon={tinted(Icon.Hashtag, Color.SecondaryText)}
          />
          {record.branchCode ? (
            <Detail.Metadata.Label
              title="Branch code"
              text={record.branchCode}
              icon={tinted(Icon.Hashtag, Color.SecondaryText)}
            />
          ) : null}
          <Detail.Metadata.Label
            title="Account number"
            text={record.accountNumber}
            icon={tinted(Icon.BankNote, Color.Green)}
          />
          <Detail.Metadata.Label title="Check digits" text={record.checkDigits} icon={tinted(Icon.Key, Color.Orange)} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Tags">
            <Detail.Metadata.TagList.Item
              text={record.sepa ? "SEPA" : "Non-SEPA"}
              color={record.sepa ? Color.Green : Color.Orange}
            />
            <Detail.Metadata.TagList.Item text={validationLabel} color={validationColor} />
            {record.invalidKind ? (
              <Detail.Metadata.TagList.Item text="Intentionally invalid" color={Color.Red} />
            ) : null}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Length"
            text={`${record.iban.length} characters`}
            icon={tinted(Icon.Ruler, Color.SecondaryText)}
          />
          <Detail.Metadata.Label
            title="Saved"
            text={formatSavedAt(record.savedAt)}
            icon={tinted(Icon.Clock, Color.SecondaryText)}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="IBAN">
            <Action.Paste title="Paste IBAN" content={text} icon={Icon.Clipboard} />
            <Action.CopyToClipboard
              title="Copy IBAN"
              content={text}
              icon={Icon.CopyClipboard}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            {record.bic ? (
              <Action.CopyToClipboard
                title="Copy BIC"
                content={record.bic}
                icon={tinted(Icon.CreditCard, Color.Purple)}
                shortcut={copyBicShortcut}
              />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section title="Generate">
            <Action
              title="Generate Another"
              icon={Icon.ArrowClockwise}
              shortcut={generateAnotherShortcut}
              onAction={regenerate}
            />
            <Action
              title="Back to Settings"
              icon={Icon.Gear}
              shortcut={Keyboard.Shortcut.Common.Edit}
              onAction={backToSettings}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
