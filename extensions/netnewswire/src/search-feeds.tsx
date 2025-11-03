import { Action, ActionPanel, List } from "@raycast/api";
import { getFavicon, runAppleScript, useCachedPromise } from "@raycast/utils";

export default function SearchFeeds() {
  const {isLoading,data:feeds} = useCachedPromise(async() => {
    const response = await runAppleScript(`
      set output to ""

      tell application "NetNewsWire"
        set allAccounts to every account
        repeat with nthAccount in allAccounts
          set accountName to name of nthAccount
          set userFeeds to allFeeds of nthAccount
          repeat with nthFeed in userFeeds
            set feedname to name of nthFeed
            set feedUrl to url of nthFeed
            set homepageUrl to homepage url of nthFeed
            set iconUrl to icon url of nthFeed
            set faviconUrl to favicon url of nthFeed
            set articleCount to count (get every article of nthFeed)
            set readCount to count (get every article of nthFeed where read is true)
            set starCount to count (get every article of nthFeed where starred is true)
            
            set output to output & accountName & tab & feedname & tab & feedUrl & tab & iconUrl & tab & faviconUrl & tab & articleCount & tab & readCount & tab & starCount & linefeed
          end repeat
        end repeat
      end tell

      return output
    `);

    const feeds = response
      .trim()
      .split('\n')
      .filter(line => line.length > 0)
      .map(line => {
        const [account, name, url, iconUrl, faviconUrl, totalArticles, readArticles, starredArticles] = line.split('\t');
        return {
          account,
          name,
          url,
          iconUrl: iconUrl !== 'missing value' ? iconUrl : null,
          faviconUrl: faviconUrl !== 'missing value' ? faviconUrl : null,
          totalArticles: parseInt(totalArticles),
          readArticles: parseInt(readArticles),
          starredArticles: parseInt(starredArticles)
        };
    });
    return feeds;
  },[],{initialData:[]})
  return (
    <List isLoading={isLoading}>
      {feeds.map((feed) => (
        <List.Item
          key={feed.name}
          icon={feed.iconUrl || feed.faviconUrl || getFavicon(feed.url)}
          title={feed.name}
          subtitle={feed.account}
          accessories={[{ text: `${feed.totalArticles}` }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={feed.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
