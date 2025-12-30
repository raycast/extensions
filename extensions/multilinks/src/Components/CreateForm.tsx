import { Form, ActionPanel, Action, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import { useRef } from "react";
import { LinkItem } from "../types";
import Service from "./../Service";
import MultiLinks from "../multi-links";
import { useBrowsers } from "../hooks/useBrowsers";
import BrowserDropdown from "./BrowserDropdown";

function CreateForm(props: { data?: LinkItem; onCreate?: () => void }) {
  const initialValues = props.data ?? { name: "", links: "", id: "", browser: "com.google.Chrome" };
  const { browsers, selectedBrowser, setSelectedBrowser } = useBrowsers(initialValues.browser);
  const nameFieldRef = useRef<Form.TextField>(null);
  const linksFieldRef = useRef<Form.TextArea>(null);
  const mode = props.data ? "edit" : "create";
  const { pop, push } = useNavigation();

  async function handleSubmit(values: LinkItem) {
    if (values.name.trim() === "") {
      await showToast({ style: Toast.Style.Failure, title: "Name is required" });
      nameFieldRef.current?.focus();
      return;
    } else if (values.links.trim() === "") {
      await showToast({ style: Toast.Style.Failure, title: "Please add links" });
      linksFieldRef.current?.focus();
      return;
    }

    if (mode === "create") {
      values.id = Math.random().toString(36).replace("0.", "");
      await Service.setLink(values);
      showToast({ title: "Multilink Created" });
      nameFieldRef.current?.reset();
      linksFieldRef.current?.reset();
      props.onCreate?.();

      if (props.onCreate) {
        pop();
      } else {
        push(<MultiLinks />);
      }
    } else {
      const success = await Service.updateLink(initialValues.id, { ...props.data, ...values });
      if (success) {
        showToast({ title: "Multilink Updated" });
        props.onCreate?.();
        pop();
      } else {
        showToast({ title: "Update failed", style: Toast.Style.Failure });
      }
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Checkmark}
            title={`${mode === "create" ? "Create" : "Update"} Multilink`}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={initialValues.name}
        placeholder="Multilink name"
        ref={nameFieldRef}
        autoFocus={true}
      />

      <Form.TextArea
        title="Links"
        id="links"
        placeholder="List of links (one per line)"
        defaultValue={initialValues.links}
        ref={linksFieldRef}
      />

      <BrowserDropdown browsers={browsers} selectedBrowser={selectedBrowser} onBrowserChange={setSelectedBrowser} />
    </Form>
  );
}

export default CreateForm;
