import { Action, ActionPanel, Form, Icon, LocalStorage, showToast, useNavigation } from "@raycast/api";
import type { Config } from "@svgr/core";
import { useState, useEffect } from "react";

export default function Settings() {
  const [settingsState, setSettingsState] = useState<Config | Record<string, never>>({});
  const { pop } = useNavigation();

  useEffect(() => {
    (async () => {
      const localSvgrSettings = await LocalStorage.getItem("svgr");
      if (typeof localSvgrSettings === "string") setSettingsState(JSON.parse(localSvgrSettings));
    })();
  }, []);

  const handleSave = async () => {
    await LocalStorage.removeItem("svgr");
    await LocalStorage.setItem("svgr", JSON.stringify(settingsState));
    await showToast({ title: "Save Successful", message: "New settings successfully saved" });
    pop();
  };

  const handleCheck = (key: string, value: string | boolean) => {
    setSettingsState((settingsState: Config) => ({
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
          const value = settingsState[key as keyof Config];
          if (typeof value === "boolean") {
            return (
              <Form.Checkbox
                key={key}
                id={key}
                title={`${value}`}
                label={key}
                onChange={(value) => handleCheck(key, value)}
                value={value}
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
                    value={value}
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
                    value={value}
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
                    value={value}
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
