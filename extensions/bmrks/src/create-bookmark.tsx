import React from "react";
import fetch from "node-fetch";
import { FormValidation, getFavicon, useForm } from "@raycast/utils";
import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
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
  interface BookmarkValues {
    groupId: string;
    value: string;
    title?: string;
  }

  const { handleSubmit, itemProps, setValue, values } = useForm<BookmarkValues>({
    async onSubmit(values) {
      const isValidColor = Boolean(colorString.get(values.value));

      if (isValidColor) {
        const res = await db.insertBookmark({
          type: "color",
          group_id: values.groupId,
          title: values.value,
        });

        if (res.error) {
          await showToast({ style: Toast.Style.Failure, title: "Something went wrong", message: res.error.message });
          return;
        }
      } else if (valueIsUrl) {
        const validUrl = ensureValidUrl(values.value);
        const favicon = getFavicon(validUrl);

        let title: string | undefined;

        if (!values.title) {
          const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(validUrl)}&data.title`);
          if (response.ok) {
            const data = (await response.json()) as MicrolinkResponse;
            title = data.data.title;
          }
        } else {
          title = "";
        }

        const res = await db.insertBookmark({
          type: "link",
          group_id: values.groupId,
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
          group_id: values.groupId,
          title: values.value,
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
    },
    validation: {
      value: FormValidation.Required,
    },
  });

  const activeTab = useActiveTab();
  const { data: groups, isLoading: isLoadingGroups } = useGroups(user);

  React.useEffect(() => {
    if (activeTab) {
      setValue("value", activeTab.url);
      setValue("title", activeTab.title);
    }
  }, [activeTab]);

  React.useEffect(() => {
    if (values.value === "") {
      setValue("title", undefined);
    }
  }, [values]);

  const valueIsUrl = isUrlLike(values.value);
  const activeGroup = groups.find((group) => group.id === values.groupId);

  return (
    <Form
      isLoading={isLoadingGroups}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Bookmark" icon={Icon.CheckCircle} onSubmit={handleSubmit} />
          {activeGroup && user && (
            <Action.OpenInBrowser
              title={`Open ${activeGroup.name} in bmrks.com`}
              url={`https://bmrks.com/${user.user_metadata["username"]}/${activeGroup.name.toLowerCase()}`}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Group" {...itemProps.groupId}>
        {groups.map((group) => (
          <Form.Dropdown.Item key={group.id} value={group.id} title={group.name} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField title="Bookmark" placeholder="Link, color, or text" {...itemProps.value} />
      {valueIsUrl && <Form.TextField title="Link Title" {...itemProps.title} />}
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
