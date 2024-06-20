import { ActionPanel, Form, Action, LocalStorage, showToast } from "@raycast/api";
import { Browser } from "./common/config";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "@raycast/utils";
import { PreferenceValue } from "./types/validate";

interface PreferenceBrowser {
  from: LocalStorage.Value;
  to: LocalStorage.Value;
}

const preferences = () => {
  const [preferBrower, setPreferBrowser] = useState<PreferenceBrowser>();
  const getPreferences = useCallback(async () => {
    const prefer_from = await LocalStorage.getItem("links_from");
    const prefer_to = await LocalStorage.getItem("links_to");

    return {
      from: prefer_from ?? Browser[0].id,
      to: prefer_to ?? Browser[0].id,
    };
  }, []);

  const { handleSubmit } = useForm<PreferenceValue>({
    onSubmit: async (values) => {
      await LocalStorage.setItem("links_from", values.links_from);
      await LocalStorage.setItem("links_to", values.links_to);
      await showToast({ title: "Preferences Saved" });
    },
  });

  useEffect(() => {
    // not elegant but it works
    getPreferences().then((data) => {
      setPreferBrowser(data);
    });
  }, []);

  return (
    <Form
      isLoading={preferBrower === undefined}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Preferences" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {!!preferBrower?.from && (
        <Form.Dropdown id="links_from" title="Save Links From" defaultValue={preferBrower?.from as string}>
          {Browser.map((browser) => {
            return <Form.Dropdown.Item key={browser.id} value={browser.id} title={browser.name} />;
          })}
        </Form.Dropdown>
      )}
      {!!preferBrower?.to && (
        <Form.Dropdown isLoading={true} id="links_to" title="Open Links On" defaultValue={preferBrower?.to as string}>
          {Browser.map((browser) => {
            return <Form.Dropdown.Item key={browser.id} value={browser.id} title={browser.name} />;
          })}
        </Form.Dropdown>
      )}
    </Form>
  );
};

export default preferences;
