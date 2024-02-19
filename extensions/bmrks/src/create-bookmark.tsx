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
import { isUrlLike } from "../lib/isUrlLike";
import { User } from "@supabase/supabase-js";

interface MicrolinkResponse {
  data: {
    title?: string;
  };
}

function Bookmark({ user }: { user: User }) {
  const [activeGroupId, setActiveGroupId] = React.useState<string | undefined>();
  const [value, setValue] = React.useState("");
  const [titleValue, setTitleValue] = React.useState<string | null>(null);

  const activeTab = useActiveTab();
  const { data: groups, isLoading: isLoadingGroups } = useGroups(user);

  React.useEffect(() => {
    if (activeTab) {
      setValue(activeTab.url);
      setTitleValue(activeTab.title);
    }
  }, [activeTab]);

  const valueIsUrl = isUrlLike(value);

  const activeGroup = groups.find((group) => group.id === activeGroupId);

  async function handleSubmit({ groupId, value }: { groupId: string; value: string; title: string }) {
    if (!value) {
      await showToast({ style: Toast.Style.Failure, title: "Missing URL", message: "Please provide one" });
      return;
    }

    const isValidColor = Boolean(colorString.get(value));

    if (isValidColor) {
      const res = await db.insertBookmark({
        type: "color",
        group_id: groupId,
        title: value,
      });

      if (res.error) {
        await showToast({ style: Toast.Style.Failure, title: "Something went wrong", message: res.error.message });
        return;
      }
    } else if (valueIsUrl) {
      const validUrl = ensureValidUrl(value);
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
        title: value,
      });

      if (res.error) {
        await showToast({ style: Toast.Style.Failure, title: "Something went wrong", message: "res.error.message" });
        return;
      }
    }

    await showHUD(`Saved to ${activeGroup!.name}`, {
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });
  }

  return (
    <Form
      isLoading={isLoadingGroups}
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
      <Form.TextField
        id="value"
        title="Bookmark"
        placeholder="Link, color, or text"
        value={value}
        onChange={setValue}
      />
      {valueIsUrl && <Form.TextField id="title" title="Link Title" value={titleValue || ""} onChange={setTitleValue} />}
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
