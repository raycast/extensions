import { Action, ActionPanel, Form, Icon, LocalStorage, useNavigation } from "@raycast/api";
import React, { useState } from "react";
import { ActionOpenPreferences } from "./components/action-open-preferences";
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

export function ConfigIcon(props: {
  iconConfig: IIconConfig;
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { iconConfig, setRefresh } = props;
  const { pop } = useNavigation();
  const [theme, setTheme] = useState<string>(iconConfig.theme);

  return (
    <Form
      navigationTitle={"Config SVG Icon"}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.List}
            title={"Back to Search Icons"}
            shortcut={{ modifiers: ["ctrl"], key: "a" }}
            onAction={pop}
          />
          <ActionToIconPark />
          <ActionOpenPreferences />
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
          setRefresh(Date.now());
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
          setRefresh(Date.now());
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
          setRefresh(Date.now());
        }}
      >
        {configTheme.map((value) => {
          return <Form.DropdownItem key={value.value} value={value.value} title={value.title} />;
        })}
      </Form.Dropdown>

      {theme === "outline" && <FormOutline iconConfig={iconConfig} setRefresh={setRefresh} />}
      {theme === "filled" && <FormFilled iconConfig={iconConfig} setRefresh={setRefresh} />}
      {theme === "two-tone" && <FormTwoTone iconConfig={iconConfig} setRefresh={setRefresh} />}
      {theme === "multi-color" && <FormMultiColor iconConfig={iconConfig} setRefresh={setRefresh} />}
      <Form.Dropdown
        id={"Stroke Line Cap"}
        title={"Stroke Line Cap"}
        defaultValue={iconConfig.strokeLinecap}
        onChange={async (newValue) => {
          const config = { ...iconConfig };
          config.strokeLinecap = newValue as StrokeLinecap;
          await LocalStorage.setItem(LocalStorageKey.ICON_CONFIG, JSON.stringify(config));
          setRefresh(Date.now());
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
          setRefresh(Date.now());
        }}
      >
        {strokeLineJoin.map((value) => {
          return <Form.DropdownItem key={value.value} value={value.value} title={value.title} />;
        })}
      </Form.Dropdown>
    </Form>
  );
}
