import { Action, ActionPanel, Form, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import SetupCredentials from "./SetupCredentials";
import { getCredentials, hasRequiredCredentials } from "../lib/storage";

export function useCredentialsGuard() {
  const { data, isLoading, revalidate } = useCachedPromise(getCredentials);
  return {
    credentials: data ?? null,
    isReady: hasRequiredCredentials(data ?? null),
    isLoading,
    revalidate,
  };
}

export function MissingCredentials() {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Key}
        title="자격 증명이 필요합니다"
        description="ACCESS_TOKEN과 광고 계정 ID를 먼저 저장하세요."
        actions={
          <ActionPanel>
            <Action.Push title="자격 증명 설정" icon={Icon.Key} target={<SetupCredentials />} />
          </ActionPanel>
        }
      />
    </List>
  );
}

export function MissingCredentialsForm() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.Push title="자격 증명 설정" icon={Icon.Key} target={<SetupCredentials />} />
        </ActionPanel>
      }
    >
      <Form.Description text="ACCESS_TOKEN과 광고 계정 ID가 없습니다. 자격 증명 설정에서 저장하세요." />
    </Form>
  );
}
