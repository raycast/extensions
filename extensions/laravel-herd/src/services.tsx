/* eslint-disable @raycast/prefer-title-case */
import { Action, ActionPanel, List, Icon } from "@raycast/api";
import { useServiceState } from "./hooks/useServiceState";
import { ServiceListSection } from "./components/Services/ServiceListSection";

export default function Command() {
  const { state, actions } = useServiceState();

  return (
    <List
      isLoading={state?.loading}
      isShowingDetail={state?.isProLicense === true && state?.installedServices?.length > 0}
    >
      {state?.isProLicense === false ? (
        <List.EmptyView
          icon={{ source: "✨" }}
          title="Services require a Herd Pro license."
          description="Manage additional services for your local development environment. Databases, queues, search engines, Laravel Reverb, and more."
          actions={
            <ActionPanel>
              <Action
                key="open-herd"
                title="Upgrade to Herd Pro"
                icon={Icon.ArrowRight}
                onAction={async () => {
                  await actions.openUpgrade();
                }}
              />
            </ActionPanel>
          }
        />
      ) : (
        state?.loading === false && (
          <>
            {state?.installedServices?.length === 0 ? (
              <List.EmptyView
                icon={{ source: "📦" }}
                title="No services installed."
                description="Install a service to get started."
                actions={
                  <ActionPanel>
                    <Action
                      key="open-services"
                      title="Open Services"
                      icon={Icon.ArrowRight}
                      onAction={async () => {
                        await actions.open();
                      }}
                    />
                  </ActionPanel>
                }
              />
            ) : (
              <>
                <List.Item
                  key="overview"
                  title="Overview"
                  accessories={[{ icon: Icon.ArrowNe, tooltip: "Open in Herd" }]}
                  actions={
                    <ActionPanel>
                      <Action
                        key="open-services"
                        title="Open Services in Herd"
                        onAction={async () => {
                          await actions.open();
                        }}
                      />
                    </ActionPanel>
                  }
                />
                {state?.installedServices?.map((service) => (
                  <ServiceListSection
                    key={service.category}
                    category={service.category}
                    services={service.services}
                    actions={actions}
                  />
                ))}
              </>
            )}
          </>
        )
      )}
    </List>
  );
}
