import { Action, ActionPanel, Form, Icon, LocalStorage, showToast, useNavigation } from "@raycast/api";
import type { Config } from "@svgr/core";
import { useState, useEffect } from "react";
import { SVGR_META, SvgrMetaKeys, DropdownKeys, DROPDOWN_KEYS } from "../../constants";

export default function Settings() {
  const [settingsState, setSettingsState] = useState<Config | Record<string, never>>({});
  const { pop } = useNavigation();

  useEffect(() => {
    const setSvgrSettings = async () => {
      const localSvgrSettings = await LocalStorage.getItem("svgr");
      if (typeof localSvgrSettings === "string") setSettingsState(JSON.parse(localSvgrSettings));
    };
    setSvgrSettings();
  }, []);

  const handleSave = async () => {
    await LocalStorage.removeItem("svgr");
    await LocalStorage.setItem("svgr", JSON.stringify(settingsState));
    await showToast({ title: "Save SVGR Settings", message: "Success" });
    pop();
  };

  const handleInput = (key: string, value: string | boolean) => {
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
          const value: boolean | string = settingsState[key as keyof Config];
          if (typeof value === "boolean") {
            return (
              <Form.Checkbox
                key={key}
                id={key}
                title={key}
                label={SVGR_META[key as SvgrMetaKeys].label}
                onChange={(value) => handleInput(key, value)}
                value={value}
              />
            );
          }
          if (typeof value === "string") {
            const isDropdown = DROPDOWN_KEYS.includes(key);
            switch (isDropdown) {
              case true:
                return (
                  <Form.Dropdown
                    key={key}
                    title={key}
                    id={key}
                    onChange={(value) => handleInput(key, value)}
                    value={value}
                    info={SVGR_META[key as SvgrMetaKeys].label}
                  >
                    {SVGR_META[key as DropdownKeys].options.map((item) => (
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
