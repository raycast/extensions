import { Action, ActionPanel, Form, showToast, Toast, LocalStorage } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { useState } from "react";
import Style = Toast.Style;
import { StorageDefines } from "./utils/Defines";
import { checkAppInstallation } from "./utils/ApplicationInstalledCheck";
import { closeMainWindowAndShowSuccessToast } from "./utils/NotificationUtils";

interface CommandForm {
  content: string;
  recentTags: string[];
  tags: string;
}

async function addTagsToRecentTags(tags: string[]) {
  const storedValue: string | undefined = await LocalStorage.getItem<string>(StorageDefines.RECENT_TAGS);
  let storedTags: string[] = [];
  if (storedValue) {
    storedTags = storedValue.split(",");
  }
  const maxTags: number = StorageDefines.RECENT_TAGS_MAX;
  const commonTags: string[] = storedTags.filter((value) => tags.includes(value));
  const uncommonTagsNew: string[] = tags.filter((value) => !commonTags.includes(value));
  const uncommonTagsOld: string[] = storedTags.filter((value) => !commonTags.includes(value));
  const allTags: string[] = [...commonTags, ...uncommonTagsNew, ...uncommonTagsOld];
  const tagsToStore: string[] = [];
  while (tagsToStore.length < maxTags) {
    if (allTags[0]) {
      tagsToStore.push(allTags[0]);
      allTags.shift();
    } else {
      break;
    }
  }
  // now store the tags
  await LocalStorage.setItem(StorageDefines.RECENT_TAGS, tagsToStore.join(","));
}

export default function Command() {
  // app installation check (shows Toast if Drafts is not installed)
  checkAppInstallation();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [recentTags, setRecentTags] = useState<string[]>([]);

  async function getRecentTags() {
    const storedValue: string | undefined = await LocalStorage.getItem<string>(StorageDefines.RECENT_TAGS);
    let storedTags: string[] = [];
    if (storedValue) {
      storedTags = storedValue.split(",");
      setRecentTags(storedTags);
    }
    setIsLoading(false);
  }
  if (recentTags.length == 0) {
    getRecentTags();
  }

  async function handleSubmit(values: CommandForm) {
    if (values.content === "") {
      await showToast({
        style: Style.Failure,
        title: "Input Error",
        message: "no content provided",
      });
      return;
    }

    let tagsString = "";
    if (values.tags != "") {
      const tags = values.tags.split(",");
      addTagsToRecentTags(tags);

      tags.map((tag) => {
        if (tagsString == "") {
          tagsString = '"' + tag + '"';
        } else {
          tagsString = tagsString + ', "' + tag + '"';
        }
      });
    }

    if (values.recentTags.length > 0) {
      const tags: string[] = values.recentTags;

      tags.map((tag) => {
        if (tagsString == "") {
          tagsString = '"' + tag + '"';
        } else {
          tagsString = tagsString + ', "' + tag + '"';
        }
      });
    }

    let appleScriptPart = "";

    if (tagsString == "") {
      appleScriptPart = "make new draft with properties {content: item 1 of argv, flagged: false}";
    } else {
      appleScriptPart =
        "make new draft with properties {content: item 1 of argv, flagged: false, tags: {" + tagsString + "}}";
    }

    try {
      await runAppleScript(
        `
      on run argv
        tell application "Drafts"
          ${appleScriptPart}
        end tell
      end run
      `,
        [values.content]
      );

      await closeMainWindowAndShowSuccessToast("Created Draft 👍");
    } catch (error) {
      await showFailureToast("Failed to create Draft");
      return;
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Create Draft" />
        </ActionPanel>
      }
    >
      <Form.TextArea id="content" title="Content" placeholder="Enter content" defaultValue="" autoFocus={true} />
      <Form.TagPicker
        id="recentTags"
        title="Recent Tags"
        defaultValue={[]}
        placeholder="Press Enter to search and select recent tags"
      >
        {recentTags.map((tag, index) => {
          return (
            <Form.TagPicker.Item key={"recentTag" + index.toString()} title={tag.toString()} value={tag.toString()} />
          );
        })}
      </Form.TagPicker>
      <Form.TextField id="tags" title="tags" placeholder="Enter comma separated tags" defaultValue="" />
    </Form>
  );
}
