import { Action, ActionPanel, Form, Icon, List, Toast, popToRoot, showToast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listAdAccounts } from "../lib/cli";
import { getCredentials, maskToken, saveCredentials } from "../lib/storage";
import { MetaRecord } from "../lib/types";

const ACCOUNT_STATUS: Record<number, string> = {
  1: "ACTIVE",
  2: "DISABLED",
  3: "UNSETTLED",
  7: "PENDING_RISK_REVIEW",
  9: "IN_GRACE_PERIOD",
  100: "PENDING_CLOSURE",
  101: "CLOSED",
  201: "ANY_CLOSED",
  202: "ANY_ACTIVE",
};

function AccountPicker({ token }: { token: string }) {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (accessToken: string) => listAdAccounts(accessToken, 100),
    [token],
  );

  async function selectAccount(account: MetaRecord) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "저장 중" });
    try {
      const existing = await getCredentials();
      await saveCredentials({
        accessToken: token,
        adAccountId: String(account.id),
        pageId: existing?.pageId,
        metaCliPath: existing?.metaCliPath,
      });
      toast.style = Toast.Style.Success;
      toast.title = "자격 증명을 저장했습니다";
      toast.message = String(account.name || account.id);
      await popToRoot();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "저장 실패";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }

  const accounts = data ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="광고 계정 이름 또는 ID 검색">
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="계정 목록을 불러오지 못했습니다"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="다시 시도" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : accounts.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Person} title="접근 가능한 광고 계정이 없습니다" />
      ) : (
        accounts.map((account) => {
          const statusCode = Number(account.account_status);
          const status = ACCOUNT_STATUS[statusCode] ?? (statusCode ? String(statusCode) : "");
          const accessories = [
            account.currency ? { text: String(account.currency) } : undefined,
            status ? { tag: status } : undefined,
          ].filter((item): item is { text: string } | { tag: string } => Boolean(item));

          return (
            <List.Item
              key={String(account.id)}
              icon={Icon.Building}
              title={String(account.name || account.id)}
              subtitle={String(account.id)}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <Action title="이 계정 사용" icon={Icon.Check} onAction={() => selectAccount(account)} />
                  <Action.CopyToClipboard title="계정 ID 복사" content={String(account.id)} />
                  <Action title="새로고침" icon={Icon.ArrowClockwise} onAction={revalidate} />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

export default function SetupCredentials() {
  const { data, isLoading } = useCachedPromise(getCredentials);
  const { push } = useNavigation();

  function openAccountPicker(token: string) {
    push(<AccountPicker token={token} />);
  }

  async function handleSubmit(values: { access_token: string }) {
    const token = values.access_token.trim() || data?.accessToken || "";
    if (!token) {
      await showToast({ style: Toast.Style.Failure, title: "ACCESS_TOKEN을 입력하세요" });
      return;
    }
    openAccountPicker(token);
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="계정 목록 불러오기" icon={Icon.List} onSubmit={handleSubmit} />
          {data?.accessToken ? (
            <Action
              title="저장된 토큰으로 계정 선택"
              icon={Icon.Key}
              onAction={() => openAccountPicker(data.accessToken)}
            />
          ) : null}
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          data?.accessToken
            ? `저장된 토큰: ${maskToken(data.accessToken)}\n새 값을 입력하면 덮어씁니다. 저장 후 광고 계정을 선택합니다.`
            : "System User Access Token을 입력하면 접근 가능한 광고 계정 목록에서 하나를 고릅니다."
        }
      />
      <Form.PasswordField
        id="access_token"
        title="ACCESS_TOKEN"
        placeholder="EAAB..."
        info="Meta System User Access Token"
      />
    </Form>
  );
}
