import { useState, useEffect } from "react";
import { ActionPanel, Action, List, showToast, Toast, Image } from "@raycast/api";
import { XMLParser } from "fast-xml-parser";
import { getStoredChannels } from "./utils/storage";
import fetch from "node-fetch";

interface YouTubeVideo {
  title: string;
  link: string;
  published: string;
  thumbnail: string;
  channelTitle: string;
}

interface XMLFeed {
  feed: {
    title: string;
    entry: Array<{
      title: string;
      link: {
        "@_href": string;
      };
      published: string;
      author: {
        name: string;
      };
    }>;
  };
}

interface Channel {
  id: string;
  title: string;
}

export default function Command() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<string>("all");

  const getVideosFromXML = (xmlString: string): YouTubeVideo[] => {
    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
      });
      const result = parser.parse(xmlString) as XMLFeed;

      if (!result.feed?.entry) return [];

      return result.feed.entry.map((entry) => {
        const link = entry.link["@_href"];
        const videoId = link.split("v=")[1];
        const thumbnail = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

        return {
          title: entry.title,
          link: link,
          published: entry.published,
          thumbnail: thumbnail,
          channelTitle: result.feed.title,
        };
      });
    } catch (error) {
      console.error("Error parsing XML:", error);
      return [];
    }
  };

  useEffect(() => {
    async function loadChannels() {
      try {
        const storedChannels = await getStoredChannels();
        setChannels(storedChannels);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Failed to load channels",
        });
      }
    }
    loadChannels();
  }, []);

  useEffect(() => {
    async function fetchVideos() {
      if (channels.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        const videoPromises = channels.map(async (channel) => {
          const response = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch videos for ${channel.title}`);
          }
          const data = await response.text();
          return getVideosFromXML(data);
        });

        const allVideosArrays = await Promise.all(videoPromises);
        const allVideos = allVideosArrays
          .flat()
          .sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());

        setVideos(allVideos);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Error loading videos",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }

    setIsLoading(true);
    fetchVideos();
  }, [channels]);

  const filteredVideos =
    selectedChannel === "all" ? videos : videos.filter((video) => video.channelTitle === selectedChannel);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search videos..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by channel" value={selectedChannel} onChange={setSelectedChannel}>
          <List.Dropdown.Item title="All channels" value="all" />
          {Array.from(new Set(videos.map((video) => video.channelTitle))).map((channel) => (
            <List.Dropdown.Item key={channel} title={channel} value={channel} />
          ))}
        </List.Dropdown>
      }
    >
      {filteredVideos.map((video) => (
        <List.Item
          key={video.link}
          title={video.title}
          subtitle={video.channelTitle}
          accessories={[
            {
              text: new Date(video.published).toLocaleDateString("en-US"),
              icon: { source: "youtube-icon.png" },
            },
          ]}
          icon={{
            source: video.thumbnail,
            mask: Image.Mask.RoundedRectangle,
          }}
          detail={
            <List.Item.Detail
              markdown={`![Thumbnail](${video.thumbnail})`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Channel" text={video.channelTitle} />
                  <List.Item.Detail.Metadata.Label title="Title" text={video.title} />
                  <List.Item.Detail.Metadata.Label
                    title="Published"
                    text={new Date(video.published).toLocaleDateString("en-US")}
                  />
                  <List.Item.Detail.Metadata.Link title="Watch" target={video.link} text="Open on YouTube" />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={video.link} title="Watch on Youtube" />
              <Action.CopyToClipboard content={video.link} title="Copy Link" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
