import React from "react";
import fetch from "node-fetch";
import { getFavicon } from "@raycast/utils";
import {
  Action,
  ActionPanel,
  Detail,
  Form,
  PopToRootType,
  Toast,
  openExtensionPreferences,
  showHUD,
  showToast,
} from "@raycast/api";
import colorString from "color-string";
import { useAuth } from "../lib/use-auth";
import { useGroups } from "../lib/use-groups";
import * as db from "../lib/db";
import { ensureValidUrl } from "../lib/ensureValidUrl";
import { useActiveTab } from "../lib/useActiveTab";
import { User } from "@supabase/supabase-js";

interface MicrolinkResponse {
  data: {
    title?: string;
  };
}

function Bookmark({ user }: { user: User }) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeGroupId, setActiveGroupId] = React.useState<string | undefined>();
  const [value, setValue] = React.useState("");
  const [titleValue, setTitleValue] = React.useState<string | null>(null);

  const activeTab = useActiveTab();
  const groups = useGroups(user);

  React.useEffect(() => {
    if (activeTab) {
      setValue(activeTab.url);
      setTitleValue(activeTab.title);
    }
  }, [activeTab]);

  React.useEffect(() => {
    if (groups.length > 0) {
      setIsLoading(false);
    }
  }, [groups]);

  const isUrlLike = value.includes(".") && !value.includes(" ");

  const activeGroup = React.useMemo(() => {
    return groups.find((group) => group.id === activeGroupId);
  }, [groups, activeGroupId]);

  async function handleSubmit({ groupId, url }: { groupId: string; url: string; title: string }) {
    if (!url) {
      await showToast({ style: Toast.Style.Failure, title: "Missing URL", message: "Please provide one" });
      return;
    }

    setIsLoading(true);

    // the function below tries to detect whether the value is like a URL
    // value may not contain http:// or https:// or www.
    // but it could still be a valid URL, like "example.com"
    const isUrlLike = url.includes(".") && !url.includes(" ");

    const isValidColor = Boolean(colorString.get(url));

    if (isValidColor) {
      const res = await db.insertBookmark({
        type: "color",
        group_id: groupId,
        title: url,
      });

      if (res.error) {
        await showToast({ style: Toast.Style.Failure, title: "Something went wrong", message: "res.error.message" });
        return;
      }
    } else if (isUrlLike) {
      const validUrl = ensureValidUrl(url);
      const favicon = await getFavicon(validUrl);

      let title: string | undefined;

      if (!titleValue) {
        const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(validUrl)}&data.title`);
        if (response.ok) {
          const data = (await response.json()) as MicrolinkResponse;
          title = data.data.title;
        }
      } else {
        title = titleValue;
      }

      const res = await db.insertBookmark({
        type: "link",
        group_id: groupId,
        url: validUrl,
        title,
        // @ts-expect-error: looks like source is missing
        favicon_url: favicon.source || "",
      });

      if (res.error) {
        await showToast({ style: Toast.Style.Failure, title: "Something went wrong", message: "res.error.message" });
        return;
      }
    } else {
      const res = await db.insertBookmark({
        type: "text",
        group_id: groupId,
        title: url,
      });

      if (res.error) {
        await showToast({ style: Toast.Style.Failure, title: "Something went wrong", message: "res.error.message" });
        return;
      }
    }

    setIsLoading(false);
    await showHUD(`Saved to ${activeGroup!.name}`, {
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Bookmark" onSubmit={handleSubmit} />
          {activeGroup && user && (
            <Action.OpenInBrowser
              url={`https://bmrks.com/${user.user_metadata["username"]}/${activeGroup.name.toLowerCase()}`}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Dropdown id="groupId" title="Group" onChange={setActiveGroupId}>
        {groups.map((group) => (
          <Form.Dropdown.Item key={group.id} value={group.id} title={group.name} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField id="url" title="Link, color, or text" value={value} onChange={setValue} />
      {isUrlLike && <Form.TextField id="title" title="Link title" value={titleValue || ""} onChange={setTitleValue} />}
    </Form>
  );
}

export default function AuthenticatedBookmark() {
  const { error, user } = useAuth();

  const markdown =
    error === "Invalid login credentials" ? error + ". Please open the preferences and try again." : error;

  if (error) {
    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  if (user) {
    return <Bookmark user={user} />;
  }

  return <Detail isLoading />;
}
