import { Icon, MenuBarExtra } from "@raycast/api";
import React from "react";
import { adjustBrightness, getSystemBrightness } from "./utils";
import { usePromise } from "@raycast/utils";

const Command = () => {
  const { data: brightness, isLoading, revalidate } = usePromise(getSystemBrightness, []);

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={Icon.Sun}
      tooltip={`Current Keyboard Brightness: ${(brightness! * 100).toFixed(0)}%`}
    >
      <MenuBarExtra.Item
        icon={Icon.Sun}
        title={`Current Brightness: ${(brightness! * 100).toFixed(0)}%`}
      />
      <MenuBarExtra.Item
        title="Increase Brightness"
        icon={Icon.Plus}
        onAction={async () => {
          await adjustBrightness(brightness!, "increase");
          revalidate();
        }}
      />
      <MenuBarExtra.Item
        title="Decrease Brightness"
        icon={Icon.Minus}
        onAction={async () => {
          await adjustBrightness(brightness!, "decrease");
          revalidate();
        }}
      />
    </MenuBarExtra>
  );
};

export default Command;
