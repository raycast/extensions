import { Form, ActionPanel, Action, showToast, Toast, Icon, popToRoot } from "@raycast/api";
import { useRef } from "react";
import { useBrowsers } from "./hooks/useBrowsers";
import BrowserDropdown from "./Components/BrowserDropdown";
import { openMultipleLinks } from "./utils/linkHelpers";

export default function OpenMultilink() {
  const { browsers, selectedBrowser, setSelectedBrowser } = useBrowsers();
  const linksFieldRef = useRef<Form.TextArea>(null);

  async function handleSubmit(values: { links: string; browser: string }) {
    if (values.links.trim() === "") {
      await showToast({ style: Toast.Style.Failure, title: "Please add links" });
      linksFieldRef.current?.focus();
      return;
    }

    const linksToOpen = values.links.split("\n").filter((link) => link.trim() !== "");

    if (linksToOpen.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "No valid links found" });
      return;
    }

    await showToast({
      style: Toast.Style.Animated,
      title: `Opening ${linksToOpen.length} link${linksToOpen.length > 1 ? "s" : ""}...`,
    });

    try {
      await openMultipleLinks(values.links, values.browser);

      await showToast({
        style: Toast.Style.Success,
        title: `Opened ${linksToOpen.length} link${linksToOpen.length > 1 ? "s" : ""}!`,
      });

      linksFieldRef.current?.reset();
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open links",
        message: String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.ArrowRight} title="Open Links" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Links"
        id="links"
        placeholder="Paste your links here (one per line)"
        ref={linksFieldRef}
        autoFocus={true}
      />

      <BrowserDropdown browsers={browsers} selectedBrowser={selectedBrowser} onBrowserChange={setSelectedBrowser} />
    </Form>
  );
}
