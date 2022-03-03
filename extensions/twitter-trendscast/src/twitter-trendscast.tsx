import { ActionPanel, Action, List, Image } from "@raycast/api";

class TwitterTrend {
  constructor(public id: String, public image:Image.ImageLike, public name: string, public url: string) {
    this.id = id;
    this.image = image;
    this.name = name;
    this.url = url;
  }
}

export default function Command() {

  const twitterTrends = [
    new TwitterTrend("1","globe.png","What's happening around you?", "https://twitter.com/explore/tabs/for-you"),
    new TwitterTrend("2","trends.png","What's trending around you?", "https://twitter.com/explore/tabs/trending"),
    new TwitterTrend("3","bolt.png","Top tweets of the day from people you follow", "https://twitter.com/search?q=min_faves%3A50%20filter%3Afollows&src=typed_query&f=top"),
    new TwitterTrend("4","flame.png","Popular tweets of the day from people you follow", "https://twitter.com/search?q=min_faves:25%20min_retweets:25%20filter:follows&src=typed_query&f=top"),
    new TwitterTrend("5","newspaper.png","Latest media tweets of the day from people you follow", "https://twitter.com/search?q=filter%3Amedia%20filter%3Afollows&src=typed_query&f=top"),
    new TwitterTrend("6","checkmark.png","Tweets from the verified users", "https://twitter.com/search?q=filter%3Averified&src=typed_query&f=top"),
  ]

  return (
    <List isLoading={false} searchBarPlaceholder="Search by title...">
      {twitterTrends.map((twitterTrend) => (
        <List.Item
          icon={twitterTrend.image}
          title={twitterTrend.name}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={twitterTrend.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

