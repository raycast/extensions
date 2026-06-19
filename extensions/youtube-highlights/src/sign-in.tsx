import { Action, ActionPanel, Detail, Icon, showToast, Toast, environment } from "@raycast/api";
import { useState, useEffect } from "react";
import { authorize, getAccessToken, logout, getUser } from "./utils/auth";
import { getHighlights } from "./utils/storage";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ uid: string; email?: string; is_pro?: boolean; name?: string } | null>(null);
  const [stats, setStats] = useState<{ memberSince: string; totalHighlights: number; videosWatched: number } | null>(
    null,
  );

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    setIsLoading(true);
    try {
      const token = await getAccessToken();
      if (token) {
        const userData = await getUser();
        setUser(userData);
      } else {
        setUser(null);
      }

      const highlights = await getHighlights();
      const totalHighlights = highlights.length;
      const uniqueVideos = new Set(highlights.map((h) => h.videoId)).size;

      let memberSince = "N/A";
      if (highlights.length > 0) {
        const firstHighlight = highlights.reduce((prev, curr) => (prev.createdAt < curr.createdAt ? prev : curr));
        memberSince = new Date(firstHighlight.createdAt).toLocaleDateString();
      }

      setStats({
        memberSince,
        totalHighlights,
        videosWatched: uniqueVideos,
      });
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignIn() {
    setIsLoading(true);
    try {
      await authorize();
      await showToast({ style: Toast.Style.Success, title: "Signed In" });
      await checkAuth();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Sign In Failed",
        message: String(error),
      });
      setIsLoading(false);
    }
  }

  async function handleSignOut() {
    setIsLoading(true);
    try {
      await logout();
      await showToast({ style: Toast.Style.Success, title: "Signed Out" });
      setUser(null);
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Sign Out Failed" });
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  const iconPath = `${environment.assetsPath}/extension-icon.png`;

  const markdown = user
    ? `
  <img src="${iconPath}" width="64" height="64" alt="YouTube Highlights Logo" />

  # Welcome back, ${user.name || "User"}!

  You are successfully signed in to **YouTube Highlights**. Your account is ready to ${user.is_pro ? "sync" : "backup"}.
  `
    : `
  <img src="${iconPath}" width="64" height="64" alt="YouTube Highlights Logo" />

  # Sign In to YouTube Highlights

  Connect your account to enable backup (free) and sync (pro) of your highlights.
  `;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Authentication Status" />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={user ? "Signed In" : "Not Signed In"}
              color={user ? "#32D74B" : "#FF3B30"} // Green or Red
            />
          </Detail.Metadata.TagList>

          <Detail.Metadata.Separator />

          {user && (
            <>
              <Detail.Metadata.Label title="Account Info" />
              <Detail.Metadata.Label title="Name" text={user.name || "N/A"} />
              <Detail.Metadata.Label title="Email" text={user.email || "N/A"} />

              <Detail.Metadata.Separator />

              <Detail.Metadata.Label title="Subscription" />
              <Detail.Metadata.TagList title="Plan">
                <Detail.Metadata.TagList.Item
                  text={user.is_pro ? "Pro Plan" : "Free Plan"}
                  color={user.is_pro ? "#FF6B00" : "#8E8E93"} // Brand orange or Gray
                />
              </Detail.Metadata.TagList>
            </>
          )}

          {stats && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="Statistics" />
              <Detail.Metadata.Label title="Member Since" text={stats.memberSince} />
              <Detail.Metadata.Label title="Total Highlights" text={stats.totalHighlights.toString()} />
              <Detail.Metadata.Label title="Videos Watched" text={stats.videosWatched.toString()} />
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {user ? (
            <Action title="Sign out" icon={Icon.XMarkCircle} onAction={handleSignOut} />
          ) : (
            <Action title="Sign in" icon={Icon.Person} onAction={handleSignIn} />
          )}
        </ActionPanel>
      }
    />
  );
}
