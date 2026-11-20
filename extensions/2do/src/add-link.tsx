import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedState, useForm } from "@raycast/utils";
import { useState } from "react";
import { BROWSER_EXTENSION_URL, fetchPage, readTab } from "./link";
import { TaskForm } from "./task-form";

// Step one takes a URL; step two is the task form, prefilled from the page or, without parsing,
// titled with the URL.
export default function Command() {
  const { push } = useNavigation();
  const [parse, setParse] = useCachedState("add-link-parse", false);
  const [isLoading, setIsLoading] = useState(false);
  const { handleSubmit, itemProps } = useForm<{ url: string }>({
    validation: {
      url: (v) => {
        if (!v) return "Required";
        if (!/^https?:\/\//i.test(v) || !URL.canParse(v)) return "Enter a web address, like https://example.com";
      },
    },
    async onSubmit({ url }) {
      if (!parse) return push(<TaskForm link={{ url, title: url, description: "" }} />);
      const toast = await showToast({ style: Toast.Style.Animated, title: "Reading page" });
      setIsLoading(true);
      try {
        const page = (await readTab(url)) ?? (await fetchPage(url));
        await toast.hide();
        push(<TaskForm link={{ url, ...page, title: page.title || url }} />);
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not read page";
        toast.message = error instanceof Error ? error.message : String(error);
        push(<TaskForm link={{ url, title: url, description: "" }} />);
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <Form
      isLoading={isLoading}
      searchBarAccessory={
        parse ? <Form.LinkAccessory target={BROWSER_EXTENSION_URL} text="Get Raycast Companion" /> : undefined
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Continue" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Link" placeholder="https://" {...itemProps.url} />
      <Form.Checkbox id="parse" label="Read page title and description" value={parse} onChange={setParse} />
      {parse && (
        <Form.Description text="Some sites block automated reading. Keep a browser open with Raycast Companion installed and enabled (link at top right). Works with Safari, Chrome, Firefox, Arc, Brave, Edge, and Vivaldi. If it still doesn't work, open the url in the browser that has the extension installed." />
      )}
    </Form>
  );
}
