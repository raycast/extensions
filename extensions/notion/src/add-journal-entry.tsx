import { BlockObjectRequest } from "@notionhq/client/build/src/api-endpoints";
import { Action, ActionPanel, Form, Toast, closeMainWindow, popToRoot, showToast } from "@raycast/api";
import { useForm, withAccessToken } from "@raycast/utils";
import { markdownToBlocks } from "@tryfabric/martian";
import { useState } from "react";

import { useJournalEntry, useSearchPages } from "./hooks";
import { addJournalEntry, getPageIcon } from "./utils/notion";
import { notionService } from "./utils/notion/oauth";

function AddJournalEntry() {
  const { lastFormValues, isLastFormValuesLoading, setLastFormValues } = useJournalEntry();
  const [isHandlingSubmit, setIsHandlingSubmit] = useState(false);
  const [searchText, setSearchText] = useState<string>("");
  const { data: searchPages, isLoading: isSearchPageLoading } = useSearchPages(searchText);
  const { itemProps, handleSubmit } = useForm<{
    appendAtTop: boolean;
    addDateDivider: boolean;
    journalEntry: string;
    page: string;
  }>({
    async onSubmit(values) {
      try {
        if (isHandlingSubmit) return;
        setIsHandlingSubmit(true);
        await showToast({ style: Toast.Style.Animated, title: "Adding journal entry" });

        const selectedPage = searchPages?.find((page) => page.id === values.page);

        if (!selectedPage || selectedPage?.object !== "page") {
          await showToast({ style: Toast.Style.Animated, title: "Page is not a journal page" });
          setIsHandlingSubmit(false);
          return;
        }

        const content = markdownToBlocks(values.journalEntry) as BlockObjectRequest[];
        await addJournalEntry(selectedPage.id, content, values.appendAtTop, values.addDateDivider);

        await setLastFormValues({
          pageId: selectedPage.id,
          appendAtTop: values.appendAtTop,
          dateDivider: values.addDateDivider,
        });
        await showToast({ style: Toast.Style.Success, title: "Captured content to page" });
        await popToRoot();
        setIsHandlingSubmit(false);
        await closeMainWindow();
      } catch (error) {
        await showToast({ style: Toast.Style.Failure, title: "Failed capturing content to page" });
      }
    },
    initialValues: {
      addDateDivider: lastFormValues?.dateDivider ?? true,
      appendAtTop: lastFormValues?.appendAtTop ?? true,
      page: lastFormValues?.pageId ?? "",
      journalEntry: "",
    },

    validation: {
      journalEntry: (input) => {
        if (!input) return "The content to add is required";
      },
    },
  });

  return (
    <Form
      isLoading={isHandlingSubmit || isLastFormValuesLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Capture Entry" />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        {...itemProps.page}
        title="Notion Page"
        isLoading={isSearchPageLoading}
        onSearchTextChange={setSearchText}
        storeValue
      >
        {searchPages?.map((page) => (
          <Form.Dropdown.Item key={page.id} title={page.title || "Untitled"} value={page.id} icon={getPageIcon(page)} />
        ))}
      </Form.Dropdown>
      <Form.TextArea enableMarkdown autoFocus title="Content" {...itemProps.journalEntry} info="Add something" />
      <Form.Checkbox
        label="Append at the top"
        {...itemProps.appendAtTop}
        info="Will try to append the content at the top of the page"
      />
      <Form.Checkbox
        label="Append with a date divider"
        {...itemProps.addDateDivider}
        info="Will add a divider with the current date before the content"
      />
    </Form>
  );
}
export default withAccessToken(notionService)(AddJournalEntry);
