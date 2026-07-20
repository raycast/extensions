import { Action, ActionPanel, Clipboard, Icon, List, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useState } from "react";
import { RutFormat, calculateVerificationDigit, formatRut, generateRutBody } from "./rut";

type RutItem = {
  index: number;
  rutBody: number;
  verificationDigit: string;
};

const FORMAT_LABELS: Record<RutFormat, string> = {
  dots: "With dots and dash (12.345.678-5)",
  dash: "Without dots, with dash (12345678-5)",
  plain: "Without dots or dash (123456785)",
};

const FORMATS: RutFormat[] = ["dots", "dash", "plain"];

export default function Command() {
  const preferences = getPreferenceValues<Preferences.GenerateRut>();
  const [format, setFormat] = useState<RutFormat>(preferences.defaultFormat);
  const [items, setItems] = useState<RutItem[]>(() => createRutItems());
  const ruts = items.map((item) => formatRut(item.rutBody, item.verificationDigit, format));

  return (
    <List
      searchBarPlaceholder="Search generated RUTs..."
      actions={
        <ActionPanel>
          <RutActions
            ruts={ruts}
            currentFormat={format}
            onFormatChange={setFormat}
            onRegenerate={() => setItems(createRutItems())}
          />
        </ActionPanel>
      }
    >
      <List.Section title="Generated RUTs" subtitle={`${items.length} RUTs - ${FORMAT_LABELS[format]}`}>
        {items.map((item) => (
          <List.Item
            key={`${item.index}-${item.rutBody}`}
            title={formatRut(item.rutBody, item.verificationDigit, format)}
            subtitle={`RUT ${item.index}`}
            icon={Icon.Person}
            actions={
              <ActionPanel>
                <RutActions
                  rut={formatRut(item.rutBody, item.verificationDigit, format)}
                  ruts={ruts}
                  currentFormat={format}
                  onFormatChange={setFormat}
                  onRegenerate={() => setItems(createRutItems())}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function createRutItems(): RutItem[] {
  return Array.from({ length: 10 }, (_, index) => {
    const rutBody = generateRutBody();

    return {
      rutBody,
      verificationDigit: calculateVerificationDigit(rutBody),
      index: index + 1,
    };
  });
}

function RutActions({
  rut,
  ruts,
  currentFormat,
  onFormatChange,
  onRegenerate,
}: {
  rut?: string;
  ruts: string[];
  currentFormat: RutFormat;
  onFormatChange: (format: RutFormat) => void;
  onRegenerate: () => void;
}) {
  return (
    <>
      {rut ? <CopyRutAction rut={rut} /> : null}
      <CopyAllRutsAction ruts={ruts} />
      <Action
        title="Generate New List"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={onRegenerate}
      />
      <ActionPanel.Section title="Format">
        {FORMATS.map((format) => (
          <Action
            key={format}
            title={`${currentFormat === format ? "Current: " : "Use Format: "}${FORMAT_LABELS[format]}`}
            icon={currentFormat === format ? Icon.CheckCircle : Icon.Circle}
            onAction={() => onFormatChange(format)}
          />
        ))}
      </ActionPanel.Section>
    </>
  );
}

function CopyRutAction({ rut }: { rut: string }) {
  return (
    <Action
      title="Copy RUT"
      icon={Icon.Clipboard}
      shortcut={{ modifiers: ["cmd"], key: "c" }}
      onAction={async () => {
        await Clipboard.copy(rut);
        await showToast({
          style: Toast.Style.Success,
          title: "RUT copied",
          message: rut,
        });
      }}
    />
  );
}

function CopyAllRutsAction({ ruts }: { ruts: string[] }) {
  return (
    <Action
      title="Copy All RUTs"
      icon={Icon.Clipboard}
      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      onAction={async () => {
        await Clipboard.copy(ruts.join("\n"));
        await showToast({
          style: Toast.Style.Success,
          title: "RUTs copied",
          message: `${ruts.length} RUTs`,
        });
      }}
    />
  );
}
