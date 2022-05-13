import { Action, ActionPanel, Form, Icon, LocalStorage, showToast, useNavigation } from "@raycast/api";
import type { Config } from "@svgr/core";
import { useState } from "react";

export default function Settings({ settings }: { settings: Config }) {
  const [settingsState, setSettingsState] = useState(settings);
  const { pop } = useNavigation();

  const handleSave = async () => {
    await LocalStorage.removeItem("svgr");
    await LocalStorage.setItem("svgr", JSON.stringify(settingsState));
    await showToast({ title: "Save Successful", message: "New settings successfully saved" });
    pop();
  };

  const handleCheck = (key: string, value: string | boolean) => {
    setSettingsState((settingsState) => ({
      ...settingsState,
      [key]: value,
    }));
  };

  return (
    <>
      <Form
        actions={
          <ActionPanel title="SVGR Settings">
            <Action.SubmitForm icon={Icon.MemoryChip} title="Save SVGR Settings" onSubmit={handleSave} />
          </ActionPanel>
        }
      >
        <Form.Description text="SVGR Settings" />
        {Object.keys(settingsState).map((key) => {
          const value = settings[key as keyof Config];
          if (typeof value === "boolean") {
            return (
              <Form.Checkbox
                key={key}
                id={key}
                label={key}
                onChange={(value) => handleCheck(key, value)}
                defaultValue={value}
              />
            );
          }
          if (typeof value === "string") {
            switch (key) {
              case "expandProps":
                return (
                  <Form.Dropdown
                    key={key}
                    title={key}
                    id={key}
                    onChange={(value) => handleCheck(key, value)}
                    defaultValue={value}
                  >
                    {["end", "start", "none"].map((item) => (
                      <Form.Dropdown.Item key={item} value={item} title={item} />
                    ))}
                  </Form.Dropdown>
                );
              case "exportType":
                return (
                  <Form.Dropdown
                    key={key}
                    title={key}
                    id={key}
                    onChange={(value) => handleCheck(key, value)}
                    defaultValue={value}
                  >
                    {["named", "export"].map((item) => (
                      <Form.Dropdown.Item key={item} value={item} title={item} />
                    ))}
                  </Form.Dropdown>
                );
              case "jsxRuntime":
                return (
                  <Form.Dropdown
                    key={key}
                    title={key}
                    id={key}
                    onChange={(value) => handleCheck(key, value)}
                    defaultValue={value}
                  >
                    {["classic", "classic-preact", "automatic"].map((item) => (
                      <Form.Dropdown.Item key={item} value={item} title={item} />
                    ))}
                  </Form.Dropdown>
                );
              default:
                return null;
            }
          }
          return null;
        })}
      </Form>
    </>
  );
}
