import { useState } from "react";
import { Action, ActionPanel, Color, Icon, List, type LaunchProps } from "@raycast/api";
import { useCachedPromise, withAccessToken, getAccessToken } from "@raycast/utils";
import { isTenantId, lookupConsumerTenant, type TenantResult } from "./lib/tenant";
import { authorize, logout } from "./lib/auth";
import { findTenantById, type TenantInfo } from "./lib/graph";
import { useHistory } from "./lib/history";
import { TenantListItem } from "./components/tenant-list-item";

function infoToResult(info: TenantInfo): TenantResult {
  return {
    input: info.tenantId,
    domain: info.defaultDomainName ?? info.tenantId,
    tenantId: info.tenantId,
    brandName: info.displayName || info.federationBrandName || undefined,
    cloud: "commercial",
    cloudLabel: "Commercial",
  };
}

interface OrgLookupProps {
  tenantId: string;
  searchText: string;
  onSearchTextChange: (text: string) => void;
}

/**
 * Authenticated organization lookup. Wrapping only this view in `withAccessToken`
 * keeps the OAuth promise in a module-level store, so the sign-in survives the
 * browser round-trip — including on Windows, where opening the browser tears the
 * command view down and would otherwise abandon a fetcher-initiated sign-in.
 */
function OrgLookup({ tenantId, searchText, onSearchTextChange }: OrgLookupProps) {
  const { token } = getAccessToken();
  const { record } = useHistory();

  const { data, isLoading } = useCachedPromise(
    async (tid: string, accessToken: string): Promise<TenantResult> => {
      try {
        return infoToResult(await findTenantById(accessToken, tid));
      } catch (error) {
        return {
          input: tid,
          domain: "",
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    [tenantId, token],
    {
      keepPreviousData: true,
      onData: (result) => {
        if (result.tenantId) void record([result]);
      },
    },
  );

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={onSearchTextChange}
      searchBarPlaceholder="Paste a tenant ID (GUID)"
      isShowingDetail={!!data?.tenantId}
      throttle
    >
      {data ? <TenantListItem result={data} /> : null}
    </List>
  );
}

const AuthedOrgLookup = withAccessToken<OrgLookupProps>({ authorize })(OrgLookup);

export default function LookUpByTenantId(props: LaunchProps<{ arguments: Arguments.LookupByTenantId }>) {
  const initial = (props.arguments?.query || props.fallbackText || "").trim();
  const [searchText, setSearchText] = useState(initial);
  const query = searchText.trim();
  const valid = isTenantId(query);
  // Well-known consumer (personal-account) tenants resolve locally, with no sign-in.
  const consumer = valid ? lookupConsumerTenant(query) : undefined;

  // Organization tenant IDs need Microsoft Graph — hand off to the authenticated
  // view. Everything else (empty, invalid, or personal-account) stays sign-in-free.
  if (valid && !consumer) {
    return <AuthedOrgLookup tenantId={query} searchText={searchText} onSearchTextChange={setSearchText} />;
  }

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Paste a tenant ID (GUID)"
      isShowingDetail={!!consumer?.tenantId}
      throttle
    >
      {!valid ? (
        <List.EmptyView
          icon={{ source: Icon.Fingerprint, tintColor: Color.Blue }}
          title={query.length === 0 ? "Look up a tenant by its ID" : "That doesn't look like a tenant ID"}
          description="Paste a tenant GUID like 72f988bf-86f1-41af-91ab-2d7cd011db47 to reveal its organization name and default domain. Personal-account tenant IDs are recognized instantly; other IDs prompt a work or school sign-in."
          actions={
            <ActionPanel>
              <Action title="Sign out" icon={Icon.Logout} style={Action.Style.Destructive} onAction={() => logout()} />
            </ActionPanel>
          }
        />
      ) : consumer ? (
        <TenantListItem result={consumer} />
      ) : null}
    </List>
  );
}
