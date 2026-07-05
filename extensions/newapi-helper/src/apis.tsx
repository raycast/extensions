import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import ApiDetailView from "./api-detail";
import type { ApiConfig } from "./lib/types";
import { deleteConfig, getConfigs, saveConfig } from "./lib/storage";
import { detectLang } from "./lib/i18n";
import type { Lang } from "./lib/i18n";

const translations: Record<string, Record<Lang, string>> = {
  title: { en: "APIs", "zh-Hans": "API 列表" },
  empty: { en: "No APIs configured yet", "zh-Hans": "还没有配置 API" },
  emptyHint: { en: "Add one to get started", "zh-Hans": "添加一个来开始吧" },
  addApi: { en: "Add API", "zh-Hans": "添加 API" },
  editApi: { en: "Edit API", "zh-Hans": "编辑 API" },
  viewDetail: { en: "View Detail", "zh-Hans": "查看详情" },
  deleteApi: { en: "Delete API", "zh-Hans": "删除 API" },
  deleteConfirm: { en: "Are you sure?", "zh-Hans": "确定要删除吗？" },
  saved: { en: "API saved", "zh-Hans": "API 已保存" },
  deleted: { en: "API deleted", "zh-Hans": "API 已删除" },
  name: { en: "Name", "zh-Hans": "名称" },
  namePlaceholder: { en: "e.g. My API", "zh-Hans": "例如：我的中转站" },
  baseUrl: { en: "API URL", "zh-Hans": "API 地址" },
  baseUrlPlaceholder: { en: "https://www.newapi.ai", "zh-Hans": "https://www.newapi.ai" },
  accessToken: { en: "Access Token", "zh-Hans": "访问令牌" },
  userId: { en: "User ID", "zh-Hans": "用户 ID" },
  accessTokenPlaceholder: { en: "System access token", "zh-Hans": "系统访问令牌" },
  userIdPlaceholder: { en: "your id in this site", "zh-Hans": "你在此站的 ID" },
  nameRequired: { en: "Name is required", "zh-Hans": "名称不能为空" },
  tokenRequired: { en: "Access Token is required", "zh-Hans": "访问令牌不能为空" },
  userIdRequired: { en: "User ID is required", "zh-Hans": "用户 ID 不能为空" },
};

function tr(key: string): string {
  const dict = translations[key];
  if (!dict) return key;
  return dict[detectLang()] ?? dict["en"] ?? key;
}

function useConfigs() {
  const [configs, setConfigs] = useState<ApiConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setConfigs(await getConfigs());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { configs, isLoading, reload: load };
}

// ─── Form Component (create / edit) ──────────────────────────────

function ApiForm({ existingConfig, onSave }: { existingConfig?: ApiConfig; onSave: () => void }) {
  const { pop } = useNavigation();
  const isEdit = Boolean(existingConfig);

  async function handleSubmit(values: { name: string; baseUrl: string; accessToken: string; userId: string }) {
    if (!values.name.trim()) {
      await showToast({ style: Toast.Style.Failure, title: tr("nameRequired") });
      return;
    }
    if (!values.accessToken.trim()) {
      await showToast({ style: Toast.Style.Failure, title: tr("tokenRequired") });
      return;
    }
    if (!values.userId.trim()) {
      await showToast({ style: Toast.Style.Failure, title: tr("userIdRequired") });
      return;
    }

    const config: ApiConfig = {
      id: existingConfig?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      name: values.name.trim(),
      baseUrl: values.baseUrl.trim(),
      accessToken: values.accessToken.trim(),
      userId: values.userId.trim(),
      createdAt: existingConfig?.createdAt ?? Date.now(),
    };

    await saveConfig(config);
    await showToast({ style: Toast.Style.Success, title: tr("saved") });
    onSave();
    pop();
  }

  return (
    <Form
      navigationTitle={isEdit ? tr("editApi") : tr("addApi")}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEdit ? tr("editApi") : tr("addApi")} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title={tr("name")}
        placeholder={tr("namePlaceholder")}
        defaultValue={existingConfig?.name}
        autoFocus
      />
      <Form.TextField
        id="baseUrl"
        title={tr("baseUrl")}
        placeholder={tr("baseUrlPlaceholder")}
        defaultValue={existingConfig?.baseUrl}
      />
      <Form.PasswordField
        id="accessToken"
        title={tr("accessToken")}
        placeholder={tr("accessTokenPlaceholder")}
        defaultValue={existingConfig?.accessToken}
      />
      <Form.TextField
        id="userId"
        title={tr("userId")}
        placeholder={tr("userIdPlaceholder")}
        defaultValue={existingConfig?.userId}
      />
    </Form>
  );
}

// ─── Main List Command ────────────────────────────────────────────

export default function Command() {
  const { configs, isLoading, reload } = useConfigs();

  async function handleDelete(id: string) {
    const ok = await confirmAlert({ title: tr("deleteConfirm") });
    if (!ok) return;
    await deleteConfig(id);
    await showToast({ style: Toast.Style.Success, title: tr("deleted") });
    reload();
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder={tr("title")}>
      {configs.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Globe}
          title={tr("empty")}
          description={tr("emptyHint")}
          actions={
            <ActionPanel>
              <Action.Push title={tr("addApi")} target={<ApiForm onSave={reload} />} icon={Icon.Plus} />
            </ActionPanel>
          }
        />
      )}

      {configs.map((cfg) => (
        <List.Item
          key={cfg.id}
          icon={Icon.Globe}
          title={cfg.name}
          subtitle={cfg.baseUrl}
          accessories={[{ text: `#${cfg.userId}` }]}
          actions={
            <ActionPanel>
              <Action.Push title={tr("viewDetail")} target={<ApiDetailView config={cfg} />} icon={Icon.Eye} />
              <Action.Push
                title={tr("editApi")}
                target={<ApiForm existingConfig={cfg} onSave={reload} />}
                icon={Icon.Pencil}
              />
              <Action
                title={tr("deleteApi")}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDelete(cfg.id)}
              />
              <Action.Push
                title={tr("addApi")}
                target={<ApiForm onSave={reload} />}
                icon={Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
