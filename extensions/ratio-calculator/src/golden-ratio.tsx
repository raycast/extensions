import { List, showToast, Toast, Clipboard, ActionPanel, Action, Icon } from "@raycast/api";
import { useState, useEffect } from "react";

export default function Command() {
  const [inputNumber, setInputNumber] = useState("");
  const [smallerNumber, setSmallerNumber] = useState("");
  const [largerNumber, setLargerNumber] = useState("");

  useEffect(() => {
    const calculateGoldenRatio = () => {
      const phi = 1.61803398875;
      let number = parseFloat(inputNumber);

      if (isNaN(number) || number <= 0) {
        setSmallerNumber("");
        setLargerNumber("");
        return;
      }

      setSmallerNumber((number / phi).toFixed(2));
      setLargerNumber((number * phi).toFixed(2));
    };

    calculateGoldenRatio();
  }, [inputNumber]);

  const handleCopyToClipboard = (value) => {
    Clipboard.copy(value);
    showToast(Toast.Style.Success, "已复制到剪贴板", value);
  };

  return (
    <List
      searchBarPlaceholder="输入一个数值"
      onSearchTextChange={setInputNumber}
      throttle
    >
      {smallerNumber && largerNumber ? (
        <>
          <List.Item
            icon={Icon.ChevronUpSmall}
            title="较小的数值"
            subtitle={smallerNumber}
            actions={
              <ActionPanel>
                <Action title="复制较小的数值" onAction={() => handleCopyToClipboard(smallerNumber)} />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.ChevronDownSmall}
            title="较大的数值"
            subtitle={largerNumber}
            actions={
              <ActionPanel>
                <Action title="复制较大的数值" onAction={() => handleCopyToClipboard(largerNumber)} />
              </ActionPanel>
            }
          />
        </>
      ) : (
        <List.Item title="请输入一个大于零的数值" />
      )}
    </List>
  );
}
