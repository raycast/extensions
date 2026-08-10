import { List, Icon, Color, Action, ActionPanel, Clipboard, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import { detectBackends, selectBackendForFile, Backend, BackendType } from "./utils/backends";
import { loadPreferences } from "./utils/preferences";

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
};

const GROUPS: { title: string; types: BackendType[]; repExt: string; prefLabel: string; prefKey: string }[] = [
  {
    title: "Presentations  ·  .pptx  .ppt  .key  .odp",
    types: ["powerpoint", "keynote", "libreoffice"],
    repExt: ".pptx",
    prefLabel: "Presentations",
    prefKey: "preferredPresentation",
  },
  {
    title: "Documents  ·  .docx  .doc  .pages  .odt  .rtf",
    types: ["word", "pages", "libreoffice"],
    repExt: ".docx",
    prefLabel: "Documents",
    prefKey: "preferredDocument",
  },
  {
    title: "Spreadsheets  ·  .xlsx  .xls  .numbers  .ods  .csv",
    types: ["excel", "numbers", "libreoffice"],
    repExt: ".xlsx",
    prefLabel: "Spreadsheets",
    prefKey: "preferredSpreadsheet",
  },
  {
    title: "Images  ·  .jpg  .png  .heic  .tiff  .gif",
    types: ["sips", "libreoffice"],
    repExt: ".jpg",
    prefLabel: "Images",
    prefKey: "preferredImage",
  },
];

type Prefs = Record<string, string>;

export default function Command() {
  const [available, setAvailable] = useState<Backend[]>([]);
  const [prefs, setPrefs] = useState<Prefs>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      setAvailable(detectBackends());
      setPrefs(await loadPreferences());
      setLoaded(true);
    })();
  }, []);

  async function setPreferred(key: string, value: string) {
    await LocalStorage.setItem(key, value);
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <List isLoading={!loaded}>
      {GROUPS.map((group) => {
        const activeBackend = loaded
          ? selectBackendForFile(prefs[group.prefKey] ?? "auto", available, group.repExt)
          : null;

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
                  actions={
                    <ActionPanel>
                      {found ? (
                        <>
                          <Action
                            title={`Set as Preferred for ${group.prefLabel}`}
                            icon={isActive ? Icon.Checkmark : Icon.ArrowRight}
                            onAction={() => setPreferred(group.prefKey, type)}
                          />
                          {prefs[group.prefKey] !== "auto" && (
                            <Action
                              title={`Reset ${group.prefLabel} to Auto`}
                              icon={Icon.ArrowCounterClockwise}
                              onAction={() => setPreferred(group.prefKey, "auto")}
                            />
                          )}
                        </>
                      ) : (
                        <>
                          {meta.installUrl && (
                            <Action.OpenInBrowser title={`Install ${meta.label}`} url={meta.installUrl} />
                          )}
                          {type === "libreoffice" && (
                            <Action
                              title="Copy Homebrew Command"
                              icon={Icon.Clipboard}
                              onAction={() => Clipboard.copy("brew install --cask libreoffice")}
                            />
                          )}
                        </>
                      )}
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
