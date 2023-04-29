/*
 * @Author: aweleey.li
 * @Date: 2023-04-18 14:30:02
 * @LastEditors: aweleey.li
 * @LastEditTime: 2023-04-24 21:27:37
 * @FilePath: /qotp/src/qotp-panel.tsx
 * @Description: -
 * @Telephone: 177****5210
 * Copyright (c) 2023 by aweleey.li, All Rights Reserved.
 */
import { useState, useEffect } from "react";
import { Action, ActionPanel, Icon, List, Clipboard, popToRoot, showHUD, Image } from "@raycast/api";
import { authenticator } from "otplib";
import { secret } from "./preferences";
import { IOTPItem, genCode, getExtraList } from "./data";
import { generate } from "./utils";
import { getProgressIcon } from "@raycast/utils";

const ExtraList = getExtraList();

export default function QOTP() {
  const [codeList] = useState(genCode());

  return (
    <List>
      {codeList.map((item, index) => (
        <OTPItem key={index} index={index} item={item} />
      ))}
      {ExtraList.map((item, index) => (
        <List.Item key={index} title={item.title} subtitle={item.subtitle} actions={<OTPPanel item={item} />} />
      ))}
    </List>
  );
}

function OTPItem(props: IOTPItemProps) {
  const { index, item: data } = props;
  const [item, setItem] = useState(data);
  const showTimeLeft = index === 0;

  useEffect(() => {
    const timer = setInterval(() => {
      const timeLeft = authenticator.timeRemaining();

      const newItem = { ...item };
      if (showTimeLeft) {
        newItem.timeLeft = timeLeft;
      }
      const newCode = generate(secret, index);
      newItem.title = newCode;
      setItem(newItem);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const itemProps = {
    key: index,
    title: item.title,
    subtitle: item.subtitle,
    actions: <OTPPanel item={item} />,
    accessories: [] as IItemAccessory[],
  };
  if (showTimeLeft) {
    itemProps["accessories"].push({
      text: "",
      icon: getProgressIcon(Number(item.timeLeft) / 30, "green"),
    });
  }

  return <List.Item {...itemProps} />;
}

OTPItem.defaultProps = {
  refresh: () => void 0,
  type: "code",
};

function OTPPanel(props: IOTPPanelProps) {
  const { item } = props;

  async function onAction(item: IOTPItem) {
    await Clipboard.copy(item.arg);
    await showHUD("Copied to clipboard !");
    await popToRoot();
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action icon={Icon.Clipboard} title="Copy to Clipboard" onAction={() => onAction(item)} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

interface IItemAccessory {
  text: string;
  icon: Image.ImageLike;
}

interface IOTPPanelProps {
  item: IOTPItem;
}

interface IOTPItemProps {
  index: number;
  item: IOTPItem;
  refresh: () => void;
}
