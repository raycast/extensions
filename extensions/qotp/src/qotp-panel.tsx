import { useState, useEffect } from "react";
import { Action, ActionPanel, Icon, List, Clipboard, popToRoot, showHUD, Image } from "@raycast/api";
import { authenticator } from "otplib";
import { secret } from "./preferences";
import { IOTPItem, genCode, getExtraList } from "./data";
import { generate, getPieIcon } from "./utils";

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
      icon: getPieIcon(Number(item.timeLeft)),
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
    await showHUD("已复制到剪贴板");
    await popToRoot();
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action icon={Icon.Clipboard} title="回车复制" onAction={() => onAction(item)} />
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
