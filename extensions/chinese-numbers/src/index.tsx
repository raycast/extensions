import { Action, ActionPanel, List } from "@raycast/api";
import { useState, Fragment } from "react";
import Nzh from "nzh";

const nzhcn = Nzh.cn;
const toChineseLowercase = (text: number) => nzhcn.encodeS(text);
const toChineseCapitalizated = (text: number) => nzhcn.encodeB(text);
const toScientificCountingMethod = (text: number) => nzhcn.encodeS(text);
const toChineseCapitalizatedAmount = (text: number) => nzhcn.toMoney(text);

export default function Command() {
  const [ChineseLowercase, setChineseLowercase] = useState<string>("");
  const [ChineseCapitalizated, setChineseCapitalizated] = useState<string>("");
  const [ScientificCountingMethod, setScientificCountingMethod] = useState<string>("");
  const [ChineseCapitalizatedAmount, setChineseCapitalizatedAmount] = useState<string>("");
  const handleOnTextChange = (value: string) => {
    if (value.length === 0) {
      setChineseLowercase("");
      setChineseCapitalizated("");
      setScientificCountingMethod("");
      setChineseCapitalizatedAmount("");
    } else {
      const input = Number(value);
      if (!isNaN(input)) {
        setChineseLowercase(toChineseLowercase(input));
        setChineseCapitalizated(toChineseCapitalizated(input));
        setScientificCountingMethod(toScientificCountingMethod(input));
        setChineseCapitalizatedAmount(toChineseCapitalizatedAmount(input));
      }
    }
  };

  return (
    <List onSearchTextChange={handleOnTextChange} enableFiltering={false} searchBarPlaceholder="Input numbers...">
      <List.EmptyView title="Waiting" description="Input Numbers..." icon="no-view.png" />
      {ChineseLowercase && (
        <Fragment>
          <List.Section title="Arabic numbers to Chinese lowercase">
            <List.Item
              title={ChineseLowercase}
              actions={
                <ActionPanel title="Copy">
                  <Action.CopyToClipboard content={ChineseLowercase} />
                </ActionPanel>
              }
            />
          </List.Section>
          <List.Section title="Arabic numbers to Chinese uppercase">
            <List.Item
              title={ChineseCapitalizated}
              actions={
                <ActionPanel title="Copy">
                  <Action.CopyToClipboard content={ChineseCapitalizated} />
                </ActionPanel>
              }
            />
          </List.Section>
          <List.Section title="Scientific notation string">
            <List.Item
              title={ScientificCountingMethod}
              actions={
                <ActionPanel title="Copy">
                  <Action.CopyToClipboard content={ScientificCountingMethod} />
                </ActionPanel>
              }
            />
          </List.Section>
          <List.Section title="Arabic numbers to Chinese amount">
            <List.Item
              title={ChineseCapitalizatedAmount}
              actions={
                <ActionPanel title="Copy">
                  <Action.CopyToClipboard content={ChineseCapitalizatedAmount} />
                </ActionPanel>
              }
            />
          </List.Section>
        </Fragment>
      )}
    </List>
  );
}
