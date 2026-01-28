/* eslint-disable @raycast/prefer-title-case */
import { Action, ActionPanel, List, Icon } from "@raycast/api";
import { useSitesState } from "./hooks/useSitesState";

export default function Command() {
  const { state, actions } = useSitesState();

  return (
    <List isLoading={state?.loading} isShowingDetail={state?.sites?.length > 0}>
      {state?.loading === false && state?.sites?.length === 0 ? (
        <List.EmptyView
          icon={{ source: "🖥️" }}
          title="No sites found."
          description="Create a new site or link an existing one to get started."
          actions={
            <ActionPanel>
              <Action
                key="open-sites"
                title="Open Sites"
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
            key={`overview`}
            title={"Overview"}
            accessories={[{ icon: Icon.ArrowNe, tooltip: "Open in Herd" }]}
            actions={
              <ActionPanel>
                <Action
                  key="open-services"
                  title={"Open Sites in Herd"}
                  onAction={async () => {
                    await actions.open();
                  }}
                />
              </ActionPanel>
            }
          />
          <List.Item
            key={`create_new`}
            title={"Create New Site"}
            accessories={[{ icon: Icon.Plus, tooltip: "Open in Herd" }]}
            actions={
              <ActionPanel>
                <Action
                  key="open-services"
                  title={"Open Site Wizard in Herd"}
                  onAction={async () => {
                    await actions.openWizard();
                  }}
                />
              </ActionPanel>
            }
          />
          <List.Section title="Browse">
            {state?.sites?.map((site) => {
              return (
                <List.Item
                  key={`site_${site.site}`}
                  title={site.site}
                  accessories={site.favorite ? [{ icon: Icon.Star, tooltip: "Favorite" }] : []}
                  icon={site.secured ? Icon.Lock : Icon.LockUnlocked}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section title={`${site.site}: Development`}>
                        <Action
                          key="open-site-ide"
                          title={`Open in IDE`}
                          icon={Icon.AppWindowSidebarLeft}
                          onAction={async () => {
                            await actions.openInIDE(site);
                          }}
                        />
                        <Action
                          key="open-site-browser"
                          title={`Open in Browser`}
                          icon={Icon.Globe}
                          onAction={async () => {
                            await actions.openInBrowser(site);
                          }}
                        />
                        {site.hasDatabaseCredentials && (
                          <Action
                            key="open-site-database"
                            title={`Open Database`}
                            icon={Icon.Coin}
                            onAction={async () => {
                              await actions.openDatabase(site);
                            }}
                          />
                        )}
                        <Action
                          key="open-site-terminal"
                          title={`Open Terminal`}
                          icon={Icon.Window}
                          onAction={async () => {
                            await actions.openTerminal(site);
                          }}
                        />
                        <Action
                          key="open-site-tinker"
                          title={`Open Tinker(well)`}
                          icon={Icon.AppWindowList}
                          onAction={async () => {
                            await actions.openTinker(site);
                          }}
                        />
                        <Action
                          key="open-site-logs"
                          title={`Open Logs`}
                          icon={Icon.Eye}
                          onAction={async () => {
                            await actions.openLogs(site);
                          }}
                        />
                        <Action.ShowInFinder key="open-site-finder" path={site.path} />
                      </ActionPanel.Section>
                      <ActionPanel.Section title={`${site.site}: Configuration`}>
                        <Action
                          key="toggle-secure"
                          title={site.secured ? "Unsecure" : "Secure"}
                          icon={site.secured ? Icon.LockUnlocked : Icon.Lock}
                          onAction={async () => {
                            await actions.toggleSecure(site);
                          }}
                        />
                        <ActionPanel.Submenu title="Isolate PHP">
                          {state?.phpVersions?.map((phpVersion) => (
                            <Action
                              key={`isolate-php-${phpVersion.cycle}`}
                              icon={site.phpVersion === phpVersion.cycle ? Icon.Check : Icon.Minus}
                              title={phpVersion.cycle}
                              onAction={async () => {
                                await actions.isolatePHP(site, phpVersion);
                              }}
                            />
                          ))}
                          <Action
                            key={`unisolate-php`}
                            icon={Icon.Globe}
                            title={"Use Global PHP"}
                            onAction={async () => {
                              await actions.unisolatePHP(site);
                            }}
                          />
                        </ActionPanel.Submenu>
                        <ActionPanel.Submenu title="Isolate Node">
                          {state?.nodeVersions?.map((nodeVersion) => (
                            <Action
                              key={`isolate-node-${nodeVersion.cycle}`}
                              icon={site.nodeVersion === nodeVersion.cycle ? Icon.Check : Icon.Minus}
                              title={nodeVersion.cycle}
                              onAction={async () => {
                                await actions.isolateNode(site, nodeVersion);
                              }}
                            />
                          ))}
                          <Action
                            key={`unisolate-node`}
                            icon={Icon.Globe}
                            title={"Use Global Node"}
                            onAction={async () => {
                              await actions.unisolateNode(site);
                            }}
                          />
                        </ActionPanel.Submenu>
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                  detail={
                    <List.Item.Detail
                      markdown={actions.parseSiteEnv(site)}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Link title="URL" target={site.url} text={site.url} />
                          <List.Item.Detail.Metadata.Label title="PHP Version" text={`PHP ${site.phpVersion}`} />
                          <List.Item.Detail.Metadata.Label title="Node Version" text={`Node ${site.nodeVersion}`} />
                          <List.Item.Detail.Metadata.Label title="Path" text={site.path} />
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                />
              );
            })}
          </List.Section>
        </>
      )}
    </List>
  );
}
