import { ActionPanel, CopyToClipboardAction, PasteAction, List } from "@raycast/api";

const punctuationMarks = [
  { name: ".", symbol: "。", description: "Period" },
  { name: ",", symbol: "，", description: "Comma" },
  { name: "`", symbol: "、", description: "Enumeration comma" },
  { name: ";", symbol: "；", description: "Semicolon" },
  { name: ":", symbol: "：", description: "Colon" },
  { name: "[", symbol: "「", description: "Quotation mark" },
  { name: "]", symbol: "」", description: "Quotation mark" },
  { name: "[", symbol: "『", description: "Quotation mark" },
  { name: "]", symbol: "』", description: "Quotation mark" },
  { name: "(", symbol: "（", description: "Brackets" },
  { name: ")", symbol: "）", description: "Brackets" },
  { name: "?", symbol: "？", description: "Question mark" },
  { name: "!", symbol: "！", description: "Excamation mark" },
  { name: "-", symbol: "─", description: "Dash" },
  { name: "~", symbol: "～", description: "Swung Dash" },
  { name: ".", symbol: "…", description: "Elipsis" },
  { name: "<", symbol: "〈", description: "Title mark" },
  { name: ">", symbol: "〉", description: "Title mark" },
  { name: "<", symbol: "《", description: "Title mark" },
  { name: ">", symbol: "》", description: "Title mark" },
  { name: ".", symbol: "．", description: "Middle dot" },
  { name: "+", symbol: "＋", description: "Plus" },
  { name: "*", symbol: "×", description: "Multiply" },
  { name: "/", symbol: "÷", description: "Substract" },
  { name: "=", symbol: "＝", description: "Equal" },
  { name: "%", symbol: "％", description: "Percent" },
];

type Mark = {
  symbol: string;
  description: string;
  name: string;
};

const PunctuationMarksListItem = (props: { mark: Mark }) => {
  const mark = props.mark;

  return (
    <List.Item
      id={mark.symbol}
      key={mark.symbol}
      title={mark.symbol}
      icon={mark.symbol}
      accessoryTitle={mark.description}
      keywords={[mark.description, mark.name]}
      actions={
        <ActionPanel>
          <PasteAction content={mark.symbol} />
          <CopyToClipboardAction content={mark.symbol} />
        </ActionPanel>
      }
    />
  );
};

export default () => (
  <List searchBarPlaceholder="Search chinese punctuation marks...">
    {punctuationMarks.map((mark) => (
      <PunctuationMarksListItem key={mark.symbol} mark={mark} />
    ))}
  </List>
);
