import { Action, ActionPanel, Form, Icon, LocalStorage, useNavigation } from "@raycast/api";
import React, { useState } from "react";
import { ActionSettings } from "./components/action-settings";
import {
  configSize,
  configTheme,
  LocalStorageKey,
  strokeLineCap,
  strokeLineJoin,
  strokeWidth,
} from "./utils/constants";
import { IIconConfig, StrokeLinecap, StrokeLinejoin, Theme } from "@icon-park/svg/lib/runtime";
import { ActionToIconPark } from "./components/action-to-Icon-park";
import { FormOutline } from "./components/form-outline";
import { FormTwoTone } from "./components/form-two-tone";
import { FormFilled } from "./components/form-filled";
import { FormMultiColor } from "./components/form-multi-color";
import { MutatePromise } from "@raycast/utils";

export function ConfigIcon(props: { iconConfig: IIconConfig; mutate: MutatePromise<string | undefined> }) {
  const { iconConfig, mutate } = props;
  const { pop } = useNavigation();
  const [theme, setTheme] = useState<string>(iconConfig.theme);

  return (
    <Form
      navigationTitle={"Config SVG Icon"}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.ArrowLeftCircle}
            title={"Back to Search Icons"}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            onAction={pop}
          />
          <ActionToIconPark />
          <ActionSettings />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id={"Size"}
        title={"Size"}
        defaultValue={iconConfig.size + ""}
        onChange={async (newValue) => {
          const config = { ...iconConfig };
          config.size = newValue;
          await LocalStorage.setItem(LocalStorageKey.ICON_CONFIG, JSON.stringify(config));
          await mutate();
        }}
      >
        {configSize().map((value) => {
          return <Form.DropdownItem key={value.value} value={value.value} title={value.title} />;
        })}
      </Form.Dropdown>

      <Form.Dropdown
        id={"Stroke Width"}
        title={"Stroke Width"}
        defaultValue={iconConfig.strokeWidth + ""}
        onChange={async (newValue) => {
          const config = { ...iconConfig };
          config.strokeWidth = parseInt(newValue);
          await LocalStorage.setItem(LocalStorageKey.ICON_CONFIG, JSON.stringify(config));
          await mutate();
        }}
      >
        {strokeWidth.map((value) => {
          return <Form.DropdownItem key={value.value} value={value.value + ""} title={value.title} />;
        })}
      </Form.Dropdown>

      <Form.Dropdown
        id={"Theme"}
        title={"Theme"}
        defaultValue={iconConfig.theme}
        onChange={async (newValue) => {
          const config = { ...iconConfig };
          config.theme = newValue as Theme;
          setTheme(config.theme);
          await LocalStorage.setItem(LocalStorageKey.ICON_CONFIG, JSON.stringify(config));
          await mutate();
        }}
      >
        {configTheme.map((value) => {
          return <Form.DropdownItem key={value.value} value={value.value} title={value.title} />;
        })}
      </Form.Dropdown>

      {theme === "outline" && <FormOutline iconConfig={iconConfig} mutate={mutate} />}
      {theme === "filled" && <FormFilled iconConfig={iconConfig} mutate={mutate} />}
      {theme === "two-tone" && <FormTwoTone iconConfig={iconConfig} mutate={mutate} />}
      {theme === "multi-color" && <FormMultiColor iconConfig={iconConfig} mutate={mutate} />}
      <Form.Dropdown
        id={"Stroke Line Cap"}
        title={"Stroke Line Cap"}
        defaultValue={iconConfig.strokeLinecap}
        onChange={async (newValue) => {
          const config = { ...iconConfig };
          config.strokeLinecap = newValue as StrokeLinecap;
          await LocalStorage.setItem(LocalStorageKey.ICON_CONFIG, JSON.stringify(config));
          await mutate();
        }}
      >
        {strokeLineCap.map((value) => {
          return <Form.DropdownItem key={value.value} value={value.value} title={value.title} />;
        })}
      </Form.Dropdown>

      <Form.Dropdown
        id={"Stroke Line Join"}
        title={"Stroke Line Join"}
        defaultValue={iconConfig.strokeLinejoin + ""}
        onChange={async (newValue) => {
          const config = { ...iconConfig };
          config.strokeLinejoin = newValue as StrokeLinejoin;
          await LocalStorage.setItem(LocalStorageKey.ICON_CONFIG, JSON.stringify(config));
          await mutate();
        }}
      >
        {strokeLineJoin.map((value) => {
          return <Form.DropdownItem key={value.value} value={value.value} title={value.title} />;
        })}
      </Form.Dropdown>
    </Form>
  );
}
