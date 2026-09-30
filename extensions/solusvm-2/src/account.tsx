import { List } from "@raycast/api";
import AccountSettingsTab from "./components/account-settings-tab";
import { useFetch } from "@raycast/utils";
import { API_HEADERS, generateApiUrl } from "./api";
import { ApiTokenResource, UserResource } from "./types";
import AccountTokensTab from "./components/account-tokens-tab";

export default function Account() {
  const { isLoading: isLoadingUser, data: user } = useFetch(generateApiUrl("account"), {
    headers: API_HEADERS,
    mapResult(result: { data: UserResource }) {
      return {
        data: result.data,
      };
    },
  });
  const { isLoading: isLoadingTokens, data: tokens } = useFetch(generateApiUrl("account/tokens"), {
    headers: API_HEADERS,
    mapResult(result: { data: ApiTokenResource[] }) {
      return {
        data: result.data,
      };
    },
    initialData: [],
  });

  return (
    <List isLoading={isLoadingUser || isLoadingTokens} isShowingDetail>
      <AccountSettingsTab user={user} />
      <AccountTokensTab tokens={tokens} />
    </List>
  );
}
