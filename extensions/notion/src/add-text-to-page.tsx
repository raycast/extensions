import { BlockObjectRequest } from "@notionhq/client/build/src/api-endpoints";
import { Action, ActionPanel, Form, Icon, LaunchProps, Toast, closeMainWindow, showToast } from "@raycast/api";
import { FormValidation, useForm, withAccessToken } from "@raycast/utils";
import { markdownToBlocks } from "@tryfabric/martian";
import { useState } from "react";

import { useSearchPages } from "./hooks";
import { appendBlockToPage, getPageIcon } from "./utils/notion";
import { notionService } from "./utils/notion/oauth";

type AddTextToPageValues = {
  prepend: boolean;
  addDateDivider: boolean;
  textToAppend: string;
  page: string;
};

function AddTextToPage(props: LaunchProps<{ arguments: Arguments.AddTextToPage }>) {
  const [searchText, setSearchText] = useState<string>("");
  const { data, isLoading } = useSearchPages(searchText);

  const { itemProps, handleSubmit } = useForm<AddTextToPageValues>({
    async onSubmit(values) {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Adding content to the page" });

        const selectedPage = searchPages?.find((page) => page.id === values.page);

        if (!selectedPage) {
          await showToast({ style: Toast.Style.Failure, title: "Could not find the selected page" });
          return;
        }

        const content = markdownToBlocks(values.textToAppend) as BlockObjectRequest[];
        await appendBlockToPage({
          pageId: selectedPage.id,
          children: content,
          prepend: values.prepend,
          addDateDivider: values.addDateDivider,
        });
        await closeMainWindow();
        await showToast({ style: Toast.Style.Success, title: "Added text to page" });
      } catch (error) {
        await showToast({ style: Toast.Style.Failure, title: "Failed adding text to page" });
      }
    },
    initialValues: {
      textToAppend: props.arguments.text ?? "",
    },
    validation: {
      page: FormValidation.Required,
      textToAppend: FormValidation.Required,
    },
  });

  const searchPages = data?.pages.filter((page) => page.object === "page");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Add Text to Page" icon={Icon.Plus} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        {...itemProps.page}
        title="Notion Page"
        isLoading={isLoading}
        onSearchTextChange={setSearchText}
        storeValue
      >
        {searchPages?.map((page) => (
          <Form.Dropdown.Item key={page.id} title={page.title ?? ""} value={page.id} icon={getPageIcon(page)} />
        ))}
      </Form.Dropdown>

      <Form.TextArea enableMarkdown autoFocus={!props.arguments.text} title="Content" {...itemProps.textToAppend} />

      <Form.Checkbox
        {...itemProps.prepend}
        label="Append at the top"
        info="Append the content at the top of the page instead of the bottom"
        storeValue
      />

      <Form.Checkbox
        {...itemProps.addDateDivider}
        label="Append with a date divider"
        info="Add a divider with the current date before the content"
        storeValue
      />
    </Form>
  );
}
export default withAccessToken(notionService)(AddTextToPage);
