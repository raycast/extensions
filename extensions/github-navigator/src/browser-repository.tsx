import type { Repository } from './types';
import {
  Action,
  ActionPanel,
  closeMainWindow,
  Color,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  open,
  showToast,
  Toast,
} from '@raycast/api';
import { useCachedPromise, useFrecencySorting } from '@raycast/utils';
import { openInBrowserTab } from 'browser-tab-bridge';
import { fetchAllRepos } from './graph';
import { sortRepos } from './repo';

const isMac = process.platform === 'darwin';
// const isWindows = process.platform === 'win32';

export default function BrowserRepository() {
  const { personalAccessToken, sort, reuseBrowserTab, frecencySortingEnabled } =
    getPreferenceValues<Preferences.BrowserRepository>();

  const { data, isLoading, revalidate } = useCachedPromise(fetchAllRepos, [personalAccessToken, sort], {
    keepPreviousData: true,
  });

  const sortedRepos = sortRepos(data);

  const { data: frecencySortedRepos, visitItem } = useFrecencySorting<Repository>(sortedRepos, {
    key: repo => repo.id,
  });

  const displayRepos = frecencySortingEnabled ? frecencySortedRepos : sortedRepos;

  async function handleRefresh() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: 'Refreshing',
    });

    try {
      await revalidate();
      toast.style = Toast.Style.Success;
      toast.title = 'Refreshed';
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = 'Failed to refresh';
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <List isLoading={isLoading && !data?.length} searchBarPlaceholder="Search repositories..." throttle>
      {displayRepos.map(repo => {
        const accessories: List.Item.Accessory[] = [];

        // info
        const infoList = [
          `Stars: ${repo.stargazers_count}`,
          `Open issues: ${repo.open_issues_count}`,
          `Open pull requests: ${repo.open_prs_count}`,
        ];
        accessories.unshift({
          icon: Icon.Info,
          tooltip: infoList.join('\n'),
        });

        // organization
        if (!repo.is_own_repo) {
          accessories.unshift({
            icon: Icon.Building,
            tooltip: `Organization: ${repo.full_name.split('/')[0]}`,
          });
        }

        // fork
        if (repo.is_fork) {
          accessories.unshift({
            icon: Icon.Anchor,
            tooltip: `Forked from ${repo.parent_full_name ?? 'unknown upstream'}`,
          });
        }

        // private
        if (repo.is_private) {
          accessories.unshift({
            icon: Icon.Lock,
            tooltip: 'Private repository',
          });
        }

        // updated_at
        const updatedAt = new Date(repo.updated_at);
        accessories.unshift({
          date: updatedAt,
          tooltip: `Last updated: ${updatedAt.toLocaleString()}`,
        });

        return (
          <List.Item
            id={repo.full_name}
            key={repo.full_name}
            icon={{ source: Icon.Receipt, tintColor: Color.SecondaryText }}
            title={repo.name}
            subtitle={repo.description}
            keywords={[repo.name, repo.full_name]}
            accessories={accessories}
            actions={
              <ActionPanel>
                {getActions(repo).map((action, index) => {
                  return (
                    <Action
                      key={action.title}
                      title={action.title}
                      icon={action.icon}
                      shortcut={{
                        macOS: {
                          modifiers: ['cmd'],
                          key: String(index + 1) as Keyboard.KeyEquivalent,
                        },
                        Windows: {
                          modifiers: ['ctrl'],
                          key: String(index + 1) as Keyboard.KeyEquivalent,
                        },
                      }}
                      onAction={async () => {
                        const shouldReuseBrowserTab = reuseBrowserTab && isMac;
                        await (shouldReuseBrowserTab ? openInBrowserTab(action.url) : open(action.url));
                        visitItem(repo);
                        closeMainWindow();
                      }}
                    />
                  );
                })}
                <Action.CopyToClipboard
                  title="Copy Repository URL"
                  content={repo.html_url}
                  icon={Icon.Link}
                  shortcut={Keyboard.Shortcut.Common.CopyName}
                />
                <Action.CopyToClipboard
                  title="Copy SSH URL"
                  content={getSshUrl(repo)}
                  icon={Icon.Terminal}
                  shortcut={Keyboard.Shortcut.Common.CopyPath}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={handleRefresh}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
  function getSshUrl(repo: Repository) {
    return `git@github.com:${repo.full_name}.git`;
  }

  function getActions(repo: Repository) {
    const base = repo.html_url;
    return [
      { title: 'Open in Browser', url: base, icon: Icon.Globe },
      { title: 'Open Issues', url: `${base}/issues`, icon: Icon.Circle },
      { title: 'Open Pull Requests', url: `${base}/pulls`, icon: Icon.ArrowNe },
      { title: 'Open Actions', url: `${base}/actions`, icon: Icon.Bolt },
      { title: 'Open Releases', url: `${base}/releases`, icon: Icon.Tag },
      { title: 'Open Insights', url: `${base}/pulse`, icon: Icon.LineChart },
      { title: 'Open Settings', url: `${base}/settings`, icon: Icon.Gear },
      { title: 'Open Dependents', url: `${base}/network/dependents`, icon: Icon.Network },
      ...(repo.is_fork && repo.parent_full_name
        ? [{ title: 'Open Upstream Repository', url: `https://github.com/${repo.parent_full_name}`, icon: Icon.Globe }]
        : []),
    ];
  }
}
