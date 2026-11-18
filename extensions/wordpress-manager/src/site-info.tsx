import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useSiteInfo, usePosts, usePages, useComments, usePlugins, useCurrentUser, getAdminUrl } from "./utils";

export default function SiteDashboard() {
  const { data: siteInfo, isLoading: loadingSite } = useSiteInfo();
  const { data: currentUser, isLoading: loadingUser } = useCurrentUser();
  const { data: posts } = usePosts({ per_page: 1 });
  const { data: pages } = usePages({ per_page: 1 });
  const { data: pendingComments } = useComments({ status: "hold", per_page: 1 });
  const { data: plugins } = usePlugins();

  const isLoading = loadingSite || loadingUser;

  const activePlugins = plugins?.filter((p) => p.status === "active").length || 0;
  const totalPlugins = plugins?.length || 0;

  return (
    <List isLoading={isLoading}>
      <List.Section title="Site Overview">
        <List.Item
          title={siteInfo?.name || "Loading..."}
          subtitle={siteInfo?.description}
          icon={{ source: Icon.Globe, tintColor: Color.Blue }}
          accessories={[{ text: siteInfo?.url }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Visit Site"
                url={siteInfo?.url || ""}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              <Action.OpenInBrowser title="Open Dashboard" url={getAdminUrl()} icon={Icon.Terminal} />
              <Action.CopyToClipboard title="Copy Site URL" content={siteInfo?.url || ""} />
            </ActionPanel>
          }
        />

        {currentUser && (
          <List.Item
            title="Logged in as"
            subtitle={currentUser.name}
            icon={{ source: Icon.Person, tintColor: Color.Green }}
            accessories={[{ tag: { value: currentUser.roles?.[0] || "User", color: Color.Purple } }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Edit Profile" url={getAdminUrl("profile.php")} />
              </ActionPanel>
            }
          />
        )}

        {siteInfo?.timezone_string && (
          <List.Item
            title="Timezone"
            subtitle={siteInfo.timezone_string}
            icon={{ source: Icon.Clock, tintColor: Color.Orange }}
          />
        )}
      </List.Section>

      <List.Section title="Quick Stats">
        <List.Item
          title="Posts"
          icon={{ source: Icon.Document, tintColor: Color.Blue }}
          accessories={[{ text: posts ? `${posts.length > 0 ? "Has content" : "Empty"}` : "Loading..." }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="View All Posts" url={getAdminUrl("edit.php")} />
              <Action.OpenInBrowser title="Add New Post" url={getAdminUrl("post-new.php")} icon={Icon.Plus} />
            </ActionPanel>
          }
        />

        <List.Item
          title="Pages"
          icon={{ source: Icon.Book, tintColor: Color.Purple }}
          accessories={[{ text: pages ? `${pages.length > 0 ? "Has content" : "Empty"}` : "Loading..." }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="View All Pages" url={getAdminUrl("edit.php?post_type=page")} />
              <Action.OpenInBrowser
                title="Add New Page"
                url={getAdminUrl("post-new.php?post_type=page")}
                icon={Icon.Plus}
              />
            </ActionPanel>
          }
        />

        <List.Item
          title="Pending Comments"
          icon={{
            source: Icon.Bubble,
            tintColor: pendingComments && pendingComments.length > 0 ? Color.Orange : Color.Green,
          }}
          accessories={[
            {
              tag:
                pendingComments && pendingComments.length > 0
                  ? { value: `${pendingComments.length}+`, color: Color.Orange }
                  : { value: "0", color: Color.Green },
            },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Moderate Comments" url={getAdminUrl("edit-comments.php")} />
            </ActionPanel>
          }
        />

        <List.Item
          title="Plugins"
          icon={{ source: Icon.Plug, tintColor: Color.Magenta }}
          accessories={[{ text: `${activePlugins} active / ${totalPlugins} total` }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Manage Plugins" url={getAdminUrl("plugins.php")} />
              <Action.OpenInBrowser title="Add New Plugin" url={getAdminUrl("plugin-install.php")} icon={Icon.Plus} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Quick Links">
        <List.Item
          title="Dashboard"
          icon={Icon.House}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open" url={getAdminUrl()} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Media Library"
          icon={Icon.Image}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open" url={getAdminUrl("upload.php")} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Users"
          icon={Icon.TwoPeople}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open" url={getAdminUrl("users.php")} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Settings"
          icon={Icon.Gear}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="General Settings" url={getAdminUrl("options-general.php")} />
              <Action.OpenInBrowser title="Reading Settings" url={getAdminUrl("options-reading.php")} />
              <Action.OpenInBrowser title="Discussion Settings" url={getAdminUrl("options-discussion.php")} />
              <Action.OpenInBrowser title="Permalink Settings" url={getAdminUrl("options-permalink.php")} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Appearance"
          icon={Icon.Eye}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Themes" url={getAdminUrl("themes.php")} />
              <Action.OpenInBrowser title="Customize" url={getAdminUrl("customize.php")} />
              <Action.OpenInBrowser title="Widgets" url={getAdminUrl("widgets.php")} />
              <Action.OpenInBrowser title="Menus" url={getAdminUrl("nav-menus.php")} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Tools"
          icon={Icon.Hammer}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Import" url={getAdminUrl("import.php")} />
              <Action.OpenInBrowser title="Export" url={getAdminUrl("export.php")} />
              <Action.OpenInBrowser title="Site Health" url={getAdminUrl("site-health.php")} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
