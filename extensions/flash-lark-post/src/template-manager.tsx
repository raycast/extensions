import {
  Action,
  ActionPanel,
  Form,
  List,
  showToast,
  Toast,
  useNavigation,
  Icon,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  MemoTemplate,
  getTemplates,
  saveTemplate,
  updateTemplate,
  deleteTemplate,
  clearCorruptedTemplateData,
} from "./utils/template-manager";

interface TemplateFormProps {
  template?: MemoTemplate;
  onSave: () => void;
}

function TemplateForm({ template, onSave }: TemplateFormProps) {
  const { pop } = useNavigation();
  const [name, setName] = useState(template?.name || "");
  const [content, setContent] = useState(template?.content || "");
  const [category, setCategory] = useState(template?.category || "一般");

  const handleSubmit = async () => {
    if (!name.trim() || !content.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "名前と内容を入力してください",
      });
      return;
    }

    try {
      if (template) {
        await updateTemplate(template.id, { name, content, category });
        await showToast({
          style: Toast.Style.Success,
          title: "テンプレートを更新しました",
        });
      } else {
        await saveTemplate({ name, content, category, isPreset: false });
        await showToast({
          style: Toast.Style.Success,
          title: "テンプレートを保存しました",
        });
      }
      onSave();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "保存に失敗しました",
        message: error instanceof Error ? error.message : "不明なエラー",
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="保存" onSubmit={handleSubmit} />
          <Action title="キャンセル" onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="テンプレート名"
        placeholder="例: 会議メモ"
        value={name}
        onChange={setName}
      />
      <Form.Dropdown id="category" title="カテゴリ" value={category} onChange={setCategory}>
        <Form.Dropdown.Item value="一般" title="一般" />
        <Form.Dropdown.Item value="ビジネス" title="ビジネス" />
        <Form.Dropdown.Item value="レポート" title="レポート" />
        <Form.Dropdown.Item value="タスク管理" title="タスク管理" />
        <Form.Dropdown.Item value="プロジェクト" title="プロジェクト" />
      </Form.Dropdown>
      <Form.TextArea
        id="content"
        title="テンプレート内容"
        placeholder="メモの内容を入力してください..."
        value={content}
        onChange={setContent}
        info="変数: {{date}} - 今日の日付, {{time}} - 現在時刻, {{datetime}} - 日時"
      />
    </Form>
  );
}

export default function TemplateManager() {
  const { push } = useNavigation();
  const [templates, setTemplates] = useState<MemoTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const allTemplates = await getTemplates();
      setTemplates(allTemplates);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "テンプレートの読み込みに失敗しました",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleDelete = async (template: MemoTemplate) => {
    if (template.isPreset) {
      await showToast({
        style: Toast.Style.Failure,
        title: "プリセットテンプレートは削除できません",
      });
      return;
    }

    const confirmed = await confirmAlert({
      title: "テンプレートを削除",
      message: `「${template.name}」を削除しますか？`,
      primaryAction: {
        title: "削除",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await deleteTemplate(template.id);
        await showToast({
          style: Toast.Style.Success,
          title: "テンプレートを削除しました",
        });
        loadTemplates();
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "削除に失敗しました",
        });
      }
    }
  };

  const handleResetData = async () => {
    const confirmed = await confirmAlert({
      title: "テンプレートデータをリセット",
      message:
        "すべてのカスタムテンプレートが削除され、プリセットテンプレートのみになります。この操作は元に戻せません。",
      primaryAction: {
        title: "リセット",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await clearCorruptedTemplateData();
        await showToast({
          style: Toast.Style.Success,
          title: "テンプレートデータをリセットしました",
        });
        loadTemplates();
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "リセットに失敗しました",
        });
      }
    }
  };

  const groupedTemplates = templates.reduce(
    (acc, template) => {
      const category = template.category || "一般";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(template);
      return acc;
    },
    {} as Record<string, MemoTemplate[]>
  );

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="テンプレートを検索..."
      actions={
        <ActionPanel>
          <Action
            title="新しいテンプレートを作成"
            icon={Icon.Plus}
            onAction={() => push(<TemplateForm onSave={loadTemplates} />)}
          />
          <Action
            title="テンプレートデータをリセット"
            icon={Icon.ExclamationMark}
            style={Action.Style.Destructive}
            onAction={handleResetData}
          />
        </ActionPanel>
      }
    >
      {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
        <List.Section key={category} title={category}>
          {categoryTemplates.map((template) => (
            <List.Item
              key={template.id}
              title={template.name || "テンプレート名なし"}
              subtitle={
                template.content
                  ? template.content.slice(0, 100) + (template.content.length > 100 ? "..." : "")
                  : ""
              }
              icon={template.isPreset ? "🔧" : "📝"}
              accessories={[{ text: template.isPreset ? "プリセット" : "カスタム" }]}
              actions={
                <ActionPanel>
                  <Action
                    title="新しいテンプレートを作成"
                    icon={Icon.Plus}
                    onAction={() => push(<TemplateForm onSave={loadTemplates} />)}
                  />
                  {!template.isPreset && (
                    <>
                      <Action
                        title="編集"
                        icon={Icon.Pencil}
                        onAction={() =>
                          push(<TemplateForm template={template} onSave={loadTemplates} />)
                        }
                      />
                      <Action
                        title="削除"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() => handleDelete(template)}
                      />
                    </>
                  )}
                  <Action.CopyToClipboard
                    title="内容をコピー"
                    content={template.content}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
