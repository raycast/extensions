import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getApplications,
  Application,
  useNavigation,
  Icon,
} from "@raycast/api";
import { useRef, useEffect, useState } from "react";
import { LinkItem } from "../types";
import Service from "./../Service";
import MultiLinks from "../multi-links";

function CreateForm(props: { data?: LinkItem; onCreate?: () => void }) {
  const [browsers, setBrowsers] = useState<Application[]>([
    { name: "Google Chrome", bundleId: "com.google.Chrome", path: "" },
  ]);
  const nameFieldRef = useRef<Form.TextField>(null);
  const linksFieldRef = useRef<Form.TextArea>(null);
  const initialValues = props.data ?? { name: "", links: "", id: "", browser: "com.google.Chrome" };
  const [selectedBrowser, setSelectedBrowser] = useState<string>("com.google.Chrome");
  const mode = props.data ? "edit" : "create";
  const { pop, push } = useNavigation();
  let updateBrowserList = true;

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

  useEffect(() => {
    (async () => {
      const installedApplications = await getApplications();

      const browserIds = [
        "com.google.Chrome",
        "com.apple.Safari",
        "com.brave.Browser",
        "org.mozilla.firefox",
        "com.microsoft.edgemac",
        "com.operasoftware.Opera",
        "org.chromium.Chromium",
        "com.vivaldi.Vivaldi",
        "company.thebrowser.Browser",
        "com.sigmaos.sigmaos.macos",
        "company.thebrowser.dia",
      ];

      const browsers = installedApplications.filter((app) => browserIds.includes(String(app.bundleId)));

      if (updateBrowserList) {
        setBrowsers(browsers);
        setSelectedBrowser(initialValues.browser);
      }
    })();

    return () => {
      updateBrowserList = false;
    };
  }, []);

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

      <Form.Dropdown id="browser" title="Open with" value={selectedBrowser} onChange={setSelectedBrowser}>
        {browsers.map((app) => (
          <Form.Dropdown.Item key={app.bundleId} value={String(app.bundleId)} title={app.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

export default CreateForm;
