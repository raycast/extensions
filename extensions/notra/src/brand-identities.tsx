import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { BrandIdentityDetail } from "./components/brand-identity-detail";
import { CreateBrandIdentityForm } from "./components/create-brand-identity-form";
import { useBrandIdentities } from "./hooks/use-brand-identities";
import { notraUrl } from "./utils";

export default function Command() {
  const { data: brandIdentities, isLoading, revalidate } = useBrandIdentities();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search brand identities...">
      <List.EmptyView
        actions={
          <ActionPanel>
            <Action.Push
              icon={Icon.Plus}
              target={<CreateBrandIdentityForm onCreated={revalidate} />}
              title="Create Brand Identity"
            />
            <Action.OpenInBrowser icon={Icon.Globe} title="View on Notra" url={notraUrl("/settings/brand")} />
          </ActionPanel>
        }
        description="Create your first brand identity from a website URL."
        title="No Brand Identities"
      />
      {(brandIdentities ?? []).map((bi) => (
        <List.Item
          accessories={[
            ...(bi.audience ? [{ text: bi.audience, tooltip: "Audience" }] : []),
            ...(bi.toneProfile ? [{ tag: { value: bi.toneProfile, color: Color.Blue } }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Eye}
                target={<BrandIdentityDetail brandIdentityId={bi.id} onMutated={revalidate} />}
                title="View Details"
              />
              <Action.Push
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<CreateBrandIdentityForm onCreated={revalidate} />}
                title="Create Brand Identity"
              />
              <Action.OpenInBrowser
                icon={Icon.Globe}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                title="View on Notra"
                url={notraUrl("/settings/brand")}
              />
            </ActionPanel>
          }
          icon={bi.isDefault ? { source: Icon.StarCircle, tintColor: Color.Yellow } : Icon.Person}
          key={bi.id}
          subtitle={bi.companyName ?? undefined}
          title={bi.name}
        />
      ))}
    </List>
  );
}
