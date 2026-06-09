import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  List,
  confirmAlert,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import {
  DictEntry,
  getDictionary,
  saveDictionary,
  mergeDefaultDictionary,
} from "./lib/storage";

interface EntryFormProps {
  entry?: DictEntry;
  index?: number;
  entries: DictEntry[];
  onSaved: (entries: DictEntry[]) => void;
}

function EntryForm({ entry, index, entries, onSaved }: EntryFormProps) {
  const { pop } = useNavigation();
  const [traditional, setTraditional] = useState(entry?.traditional ?? "");
  const [simplified, setSimplified] = useState(entry?.simplified ?? "");
  const [tradError, setTradError] = useState<string | undefined>();
  const [simpError, setSimpError] = useState<string | undefined>();

  async function handleSubmit() {
    const trad = traditional.trim();
    const simp = simplified.trim();

    if (!trad) {
      setTradError("必填");
      return;
    }
    if (!simp) {
      setSimpError("必填");
      return;
    }

    const next = [...entries];
    const newEntry: DictEntry = { traditional: trad, simplified: simp };
    if (typeof index === "number") {
      next[index] = newEntry;
    } else {
      next.push(newEntry);
    }

    await saveDictionary(next);
    onSaved(next);
    await showToast({
      style: Toast.Style.Success,
      title: typeof index === "number" ? "已更新規則" : "已新增規則",
    });
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="儲存" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="traditional"
        title="繁體中文"
        placeholder="例如：資料庫"
        value={traditional}
        error={tradError}
        onChange={(v) => {
          setTraditional(v);
          if (tradError) setTradError(undefined);
        }}
      />
      <Form.TextField
        id="simplified"
        title="簡體中文"
        placeholder="例如：数据库"
        value={simplified}
        error={simpError}
        onChange={(v) => {
          setSimplified(v);
          if (simpError) setSimpError(undefined);
        }}
      />
      <Form.Description text="轉換時，此規則會優先於逐字轉換。繁體 → 簡體會套用此對應，簡體 → 繁體則反向套用。" />
    </Form>
  );
}

export default function Command() {
  const [entries, setEntries] = useState<DictEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    (async () => {
      setEntries(await getDictionary());
      setIsLoading(false);
    })();
  }, []);

  async function handleDelete(index: number) {
    const confirmed = await confirmAlert({
      title: "刪除此規則？",
      primaryAction: { title: "刪除", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) {
      return;
    }
    const next = entries.filter((_, i) => i !== index);
    await saveDictionary(next);
    setEntries(next);
    await showToast({ style: Toast.Style.Success, title: "已刪除規則" });
  }

  async function handleLoadPreset() {
    const { entries: merged, added } = await mergeDefaultDictionary(entries);
    setEntries(merged);
    await showToast({
      style: Toast.Style.Success,
      title: added > 0 ? `已載入 ${added} 條預設規則` : "預設規則已全部存在",
    });
  }

  const loadPresetAction = (
    <Action
      title="載入預設字典"
      icon={Icon.Download}
      shortcut={{ modifiers: ["cmd"], key: "d" }}
      onAction={handleLoadPreset}
    />
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="搜尋自定義轉換規則"
      actions={
        <ActionPanel>
          <Action
            title="新增規則"
            icon={Icon.Plus}
            onAction={() =>
              push(<EntryForm entries={entries} onSaved={setEntries} />)
            }
          />
          {loadPresetAction}
        </ActionPanel>
      }
    >
      <List.EmptyView
        title="尚無自定義規則"
        description="按 Enter 新增規則，或用 ⌘D 載入預設字典"
        icon={Icon.Book}
      />
      {entries.map((entry, index) => (
        <List.Item
          key={`${entry.traditional}-${entry.simplified}-${index}`}
          title={`${entry.traditional}  ⇄  ${entry.simplified}`}
          icon={Icon.Text}
          accessories={[{ text: "繁 ⇄ 簡" }]}
          actions={
            <ActionPanel>
              <Action
                title="編輯規則"
                icon={Icon.Pencil}
                onAction={() =>
                  push(
                    <EntryForm
                      entry={entry}
                      index={index}
                      entries={entries}
                      onSaved={setEntries}
                    />,
                  )
                }
              />
              <Action
                title="新增規則"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={() =>
                  push(<EntryForm entries={entries} onSaved={setEntries} />)
                }
              />
              <Action
                title="刪除規則"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => handleDelete(index)}
              />
              {loadPresetAction}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
