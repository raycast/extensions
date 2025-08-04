import React from "react";
import { MenuBarExtra, Icon, getPreferenceValues, openExtensionPreferences, open } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";

const preferences = getPreferenceValues();

interface PostStats {
  recipients: number;
  opens: number;
  unique_opens: number;
  clicks: number;
}

interface Post {
  id: string;
  title: string;
  publish_date: number;
  stats?: {
    email?: PostStats;
  };
  platform?: string;
}

export default function LastEmailStatsMenuBar() {
  const [isLoading, setIsLoading] = useState(true);
  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchLastEmail = async () => {
    try {
      setIsLoading(true);
      // Fetch latest post with stats expansion
      const response = await fetch(
        `https://api.beehiiv.com/v2/publications/${preferences.publicationId}/posts?expand[]=stats&limit=10&status=confirmed&order_by=created&direction=desc`,
        {
          headers: {
            Authorization: `Bearer ${preferences.apiKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const now = Math.floor(Date.now() / 1000);
      const fetchedPost =
        (data.data as Post[])
          .filter((p) => (p.platform === "email" || p.platform === "both") && p.publish_date <= now)
          .sort((a, b) => b.publish_date - a.publish_date)[0] || null;
      setPost(fetchedPost);
    } catch (e) {
      console.error("Error fetching last email stats:", e);
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLastEmail();
    // Odświeżaj co 10 minut
    const interval = setInterval(fetchLastEmail, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const emailStats = post?.stats?.email;

  const title = emailStats ? `${post?.title}: ${emailStats.unique_opens}/${emailStats.recipients}` : "Beehiiv";

  return (
    <MenuBarExtra
      icon={Icon.Envelope}
      isLoading={isLoading}
      title={title}
      tooltip={post?.title || "Beehiiv Last Email"}
    >
      {error && <MenuBarExtra.Item title={`Error: ${error}`} icon={Icon.Warning} onAction={openExtensionPreferences} />}

      {post && emailStats && (
        <>
          <MenuBarExtra.Item title={post.title} icon={Icon.Document} />
          <MenuBarExtra.Item title={`Recipients: ${emailStats.recipients}`} icon={Icon.Person} />
          <MenuBarExtra.Item title={`Unique Opens: ${emailStats.unique_opens}`} icon={Icon.Eye} />
          <MenuBarExtra.Item title={`Clicks: ${emailStats.clicks}`} icon={Icon.ArrowNe} />
          <MenuBarExtra.Item
            title="Open Analytics"
            icon={Icon.Link}
            onAction={() => {
              const id = post.id.replace("post_", "");
              open(`https://app.beehiiv.com/posts/${id}/analytics`);
            }}
          />
          <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchLastEmail} />
        </>
      )}

      {!post && !error && !isLoading && <MenuBarExtra.Item title="No emails found" />}
    </MenuBarExtra>
  );
}
