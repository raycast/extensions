import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import React, { Dispatch, SetStateAction } from "react";
import { AvatarOptions } from "./types/types";
import * as d3 from "d3-color";

export default function AdvancedOptionsPage(props: {
  avatarOptions: AvatarOptions;
  setAvatarOptions: Dispatch<SetStateAction<AvatarOptions>>;
}) {
  const { avatarOptions, setAvatarOptions } = props;
  const _avatarOptions = { ...avatarOptions };
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle={"Advanced Options"}
      actions={
        <ActionPanel>
          <Action icon={Icon.Sidebar} title={"Save Settings"} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id={"backgroundColor"}
        title="Background Color"
        defaultValue={avatarOptions.backgroundColor + ""}
        placeholder={"#FFFFFF"}
        info={"#FFFFFF"}
        onChange={(newValue) => {
          _avatarOptions.backgroundColor = d3.rgb(newValue.replaceAll(" ", "")).formatHex();
          setAvatarOptions(_avatarOptions);
        }}
      />
      <Form.TextField
        id={"radius"}
        title="Radius"
        defaultValue={avatarOptions.radius + ""}
        placeholder={"0~50"}
        info={"0~50"}
        onChange={(newValue) => {
          let value = parseInt(newValue);
          if (isNaN(value)) value = 0;
          if (value < 0) value = 0;
          if (value > 50) value = 50;
          _avatarOptions.radius = value;
          setAvatarOptions(_avatarOptions);
        }}
      />
      <Form.TextField
        id={"scale"}
        title="Scale"
        defaultValue={avatarOptions.scale + ""}
        placeholder={"0~200"}
        info={"0~200"}
        onChange={(newValue) => {
          let value = parseInt(newValue);
          if (isNaN(value)) value = 0;
          if (value < 0) value = 0;
          if (value > 200) value = 200;
          _avatarOptions.scale = value;
          setAvatarOptions(_avatarOptions);
        }}
      />
      <Form.TextField
        id={"rotate"}
        title="Rotate"
        defaultValue={avatarOptions.rotate + ""}
        placeholder={"0~360"}
        info={"0~360"}
        onChange={(newValue) => {
          let value = parseInt(newValue);
          if (isNaN(value)) value = 0;
          if (value < 0) value = 0;
          if (value > 360) value = 360;
          _avatarOptions.rotate = value;
          setAvatarOptions(_avatarOptions);
        }}
      />
      <Form.TextField
        id={"translateX"}
        title="TranslateX"
        defaultValue={avatarOptions.translateX + ""}
        placeholder={"-100~100"}
        info={"-100~100"}
        onChange={(newValue) => {
          let value = parseInt(newValue);
          if (isNaN(value)) value = 0;
          if (value < -100) value = -100;
          if (value > 100) value = 100;
          _avatarOptions.translateX = value;
          setAvatarOptions(_avatarOptions);
        }}
      />
      <Form.TextField
        id={"translateY"}
        title="TranslateX"
        defaultValue={avatarOptions.translateY + ""}
        placeholder={"-100~100"}
        info={"-100~100"}
        onChange={(newValue) => {
          let value = parseInt(newValue);
          if (isNaN(value)) value = 0;
          if (value < -100) value = -100;
          if (value > 100) value = 100;
          _avatarOptions.translateY = parseInt(newValue);
          setAvatarOptions(_avatarOptions);
        }}
      />
      <Form.Checkbox
        id={"flip"}
        title="Flip"
        defaultValue={avatarOptions.flip}
        onChange={(newValue) => {
          _avatarOptions.flip = newValue;
          setAvatarOptions(_avatarOptions);
        }}
        label={"Flip"}
      />
    </Form>
  );
}
