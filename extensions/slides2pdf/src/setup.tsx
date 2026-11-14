import { List, Icon, Color, Action, ActionPanel, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { detectBackends, selectBackendForFile, BackendType } from "./utils/backends";

interface BackendMeta {
  label: string;
  installUrl?: string;
  hint: string;
}

const BACKEND_META: Record<BackendType, BackendMeta> = {
  keynote: {
    label: "Keynote",
    installUrl: "https://apps.apple.com/us/app/keynote/id409183694",
    hint: "Free on the Mac App Store",
  },
  powerpoint: {
    label: "Microsoft PowerPoint",
    installUrl: "https://www.microsoft.com/microsoft-365",
    hint: "Part of Microsoft 365",
  },
  pages: {
    label: "Pages",
    installUrl: "https://apps.apple.com/us/app/pages/id409201541",
    hint: "Free on the Mac App Store",
  },
  word: {
    label: "Microsoft Word",
    installUrl: "https://www.microsoft.com/microsoft-365",
    hint: "Part of Microsoft 365",
  },
  numbers: {
    label: "Numbers",
    installUrl: "https://apps.apple.com/us/app/numbers/id409203825",
    hint: "Free on the Mac App Store",
  },
  excel: {
    label: "Microsoft Excel",
    installUrl: "https://www.microsoft.com/microsoft-365",
    hint: "Part of Microsoft 365",
  },
  libreoffice: {
    label: "LibreOffice",
    installUrl: "https://www.libreoffice.org/download/",
    hint: "Free & open source — brew install --cask libreoffice",
  },
  sips: {
    label: "sips",
    hint: "Built into macOS — no install needed",
  },
  builtin: {
    label: "Text Renderer",
    hint: "Bundled with the extension — no install needed",
  },
};

type EnginePrefKey = "preferredPresentation" | "preferredDocument" | "preferredSpreadsheet" | "preferredImage";

const GROUPS: {
  title: string;
  types: BackendType[];
  repExt: string;
  prefKey: EnginePrefKey;
}[] = [
  {
    title: "Presentations  ·  .pptx  .ppt  .key  .odp",
    types: ["powerpoint", "keynote", "libreoffice"],
    repExt: ".pptx",
    prefKey: "preferredPresentation",
  },
  {
    title: "Documents  ·  .docx  .doc  .pages  .odt  .rtf",
    types: ["word", "pages", "libreoffice"],
    repExt: ".docx",
    prefKey: "preferredDocument",
  },
  {
    title: "Spreadsheets  ·  .xlsx  .xls  .numbers  .ods  .csv",
    types: ["excel", "numbers", "libreoffice"],
    repExt: ".xlsx",
    prefKey: "preferredSpreadsheet",
  },
  {
    title: "Images  ·  .jpg  .png  .heic  .tiff  .gif",
    types: ["sips", "libreoffice"],
    repExt: ".jpg",
    prefKey: "preferredImage",
  },
];

function engineActions(type: BackendType, installUrl?: string) {
  return (
    <ActionPanel>
      {installUrl && <Action.OpenInBrowser title={`Install ${BACKEND_META[type].label}`} url={installUrl} />}
      {installUrl && type === "libreoffice" && (
        <Action.CopyToClipboard title="Copy Homebrew Command" content="brew install --cask libreoffice" />
      )}
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel>
  );
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const available = detectBackends();

  return (
    <List searchBarPlaceholder="Search Engines">
      {GROUPS.map((group) => {
        const activeBackend = selectBackendForFile(prefs[group.prefKey], available, group.repExt);

        return (
          <List.Section key={group.prefKey} title={group.title}>
            {group.types.map((type) => {
              const meta = BACKEND_META[type];
              const found = available.find((b) => b.type === type);
              const isActive = activeBackend?.type === type;
              const accessories: List.Item.Accessory[] = [
                ...(isActive ? [{ tag: { value: "In Use", color: Color.Green } } as List.Item.Accessory] : []),
                {
                  icon: found
                    ? { source: Icon.Checkmark, tintColor: Color.Green }
                    : { source: Icon.Xmark, tintColor: Color.Red },
                },
              ];

              return (
                <List.Item
                  key={`${group.prefKey}-${type}`}
                  title={meta.label}
                  subtitle={found ? found.path : meta.hint}
                  accessories={accessories}
                  actions={engineActions(type, found ? undefined : meta.installUrl)}
                />
              );
            })}
          </List.Section>
        );
      })}
      <List.Section title="Text & Code  ·  .json  .md  .xml  .log  source files …">
        <List.Item
          title={BACKEND_META.builtin.label}
          subtitle={BACKEND_META.builtin.hint}
          accessories={[
            { tag: { value: "In Use", color: Color.Green } },
            { icon: { source: Icon.Checkmark, tintColor: Color.Green } },
          ]}
          actions={engineActions("builtin")}
        />
      </List.Section>
    </List>
  );
}
