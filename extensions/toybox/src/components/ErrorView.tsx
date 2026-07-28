import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";

/**
 * 通用错误视图：在 `Detail` 中展示错误原因，提供返回操作。
 *
 * 所有错误（非法 URL、JSON/curl 解析失败、超时、DNS/TLS/网络错误、取消）
 * 统一经此展示，不抛未捕获异常。
 */
export interface ErrorViewProps {
  error: string;
  /** 标题，默认「请求失败」。 */
  title?: string;
}

export function ErrorView({ error, title = "请求失败" }: ErrorViewProps) {
  const navigation = useNavigation();
  return (
    <Detail
      markdown={`## ${title}\n\n\`\`\`\n${error}\n\`\`\``}
      actions={
        <ActionPanel>
          <Action title="返回" icon={Icon.ArrowLeft} onAction={() => navigation.pop()} />
        </ActionPanel>
      }
    />
  );
}
