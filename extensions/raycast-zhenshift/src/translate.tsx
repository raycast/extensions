import {
  Action,
  ActionPanel,
  Clipboard,
  getPreferenceValues,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { validatePreferences } from "./lib/preferences";
import { translateText } from "./lib/translate";

type TranslatePreferences = {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
};

type ViewStateInput = {
  text: string;
  loading: boolean;
  error: string | null;
  configError: string | null;
  directionLabel: string;
  translation: string;
};

export function buildViewState(input: ViewStateInput) {
  if (input.configError) {
    return {
      statusTitle: "配置错误",
      markdown: `# 配置错误

${input.configError}

请先在扩展设置中填写 \`Base URL\`、\`API Key\` 和 \`Model\`。`,
    };
  }

  if (!input.text.trim()) {
    return {
      statusTitle: "待输入",
      markdown: `# 待输入

在搜索框输入中文或英文文本后，ZhenShift 会自动判断方向并开始翻译。`,
    };
  }

  if (input.loading) {
    return {
      statusTitle: "翻译中",
      markdown: `# 翻译中

正在请求模型生成译文，请稍候。`,
    };
  }

  if (input.error) {
    return {
      statusTitle: "翻译失败",
      markdown: `# 翻译失败

${input.error}`,
    };
  }

  if (input.translation) {
    return {
      statusTitle: "翻译成功",
      markdown: `# 翻译成功

**方向**：${input.directionLabel}

## 译文

${input.translation}`,
    };
  }

  return {
    statusTitle: "待翻译",
    markdown: `# 待翻译

按回车开始翻译。`,
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "发生未知错误";
}

export default function TranslateCommand() {
  const [preferencesState] = useState(() => {
    try {
      return {
        preferences: validatePreferences(getPreferenceValues<TranslatePreferences>()),
        error: null,
      };
    } catch (error) {
      return {
        preferences: null,
        error: getErrorMessage(error),
      };
    }
  });
  const [text, setText] = useState("");
  const [submittedText, setSubmittedText] = useState("");
  const [directionLabel, setDirectionLabel] = useState("");
  const [translation, setTranslation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!submittedText.trim()) {
      setDirectionLabel("");
      setTranslation("");
      setError(null);
      setLoading(false);
      return;
    }

    if (!preferencesState.preferences) {
      setDirectionLabel("");
      setTranslation("");
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      void translateText({
        text: submittedText,
        ...preferencesState.preferences,
      })
        .then((result) => {
          if (cancelled) {
            return;
          }

          setDirectionLabel(result.directionLabel);
          setTranslation(result.translation);
        })
        .catch((requestError) => {
          if (cancelled) {
            return;
          }

          setDirectionLabel("");
          setTranslation("");
          setError(getErrorMessage(requestError));
        })
        .finally(() => {
          if (cancelled) {
            return;
          }

          setLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [submittedText, refreshToken, preferencesState]);

  const viewState = buildViewState({
    text,
    loading,
    error,
    configError: preferencesState.error,
    directionLabel,
    translation,
  });

  const handleCopy = async () => {
    if (!translation) {
      return;
    }

    await Clipboard.copy(translation);
    await showToast({
      style: Toast.Style.Success,
      title: "已复制译文",
    });
  };

  const handleSubmit = () => {
    if (!text.trim() || !preferencesState.preferences) {
      return;
    }

    setDirectionLabel("");
    setTranslation("");
    setError(null);
    setSubmittedText(text);
    setRefreshToken((value) => value + 1);
  };

  return (
    <List
      isLoading={loading}
      isShowingDetail
      searchBarPlaceholder="输入中文或英文后自动翻译"
      searchText={text}
      onSearchTextChange={(value) => {
        setText(value);
        setLoading(false);
        setDirectionLabel("");
        setTranslation("");
        setError(null);
      }}
    >
      <List.Item
        id="translation"
        title={viewState.statusTitle}
        subtitle={directionLabel || "自动中英互译"}
        detail={<List.Item.Detail markdown={viewState.markdown} />}
        actions={
          <ActionPanel>
            {text.trim() && preferencesState.preferences ? (
              <Action title="开始翻译" onAction={handleSubmit} />
            ) : null}
            {translation ? <Action title="复制结果" onAction={handleCopy} /> : null}
            {submittedText.trim() && preferencesState.preferences ? (
              <Action title="重新翻译" onAction={() => setRefreshToken((value) => value + 1)} />
            ) : null}
            <Action
              title="清空输入"
              onAction={() => {
                setText("");
                setSubmittedText("");
                setDirectionLabel("");
                setTranslation("");
                setError(null);
              }}
            />
            <Action title="打开扩展设置" onAction={() => void openExtensionPreferences()} />
          </ActionPanel>
        }
      />
    </List>
  );
}
