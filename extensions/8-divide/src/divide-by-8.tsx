import {
  Clipboard,
  showHUD,
  ActionPanel,
  Action,
  List,
  Detail,
  closeMainWindow,
  getFrontmostApplication,
  popToRoot,
  getSelectedText,
} from "@raycast/api";
import { useState, useEffect } from "react";

function isDivisibleByEight(num: number): boolean {
  return num % 8 === 0;
}

function roundUpToEight(num: number): number {
  return Math.ceil(num / 8) * 8;
}

function roundDownToEight(num: number): number {
  return Math.floor(num / 8) * 8;
}

export default function Command() {
  const [number, setNumber] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setNumber(null);
    setError(null);
  };

  const checkSelectedText = async () => {
    try {
      const selectedText = await getSelectedText();
      if (!selectedText) {
        setError("No text is selected");
        return;
      }

      const parsedNumber = parseFloat(selectedText);
      if (isNaN(parsedNumber)) {
        setError("Selected text is not a valid number");
        return;
      }

      setNumber(parsedNumber);
    } catch (err) {
      setError("An error occurred while reading the selected text");
    }
  };

  useEffect(() => {
    checkSelectedText();
  }, []);

  useEffect(() => {
    if (number !== null && isDivisibleByEight(number)) {
      showHUD(`🧢 ${number} is divisible by 8`);
      resetState();
      popToRoot();
      closeMainWindow();
    }
  }, [number]);

  if (error) {
    return <Detail markdown={`# Error\n\n${error}`} />;
  }

  if (number === null) {
    return <Detail markdown="# Error\n\nUnable to process number" />;
  }

  return (
    <List>
      <List.Item
        title={`Round Up to ${roundUpToEight(number)}`}
        subtitle={`Current is ${number}`}
        actions={
          <ActionPanel>
            <Action
              title="Round Up"
              onAction={async () => {
                const roundedUp = roundUpToEight(number);
                const frontmostApplication = await getFrontmostApplication();
                await Clipboard.paste(roundedUp.toString());
                await showHUD(`👟 Rounded up to ${roundedUp} and pasted to ${frontmostApplication.name}`);
                resetState();
                popToRoot();
                closeMainWindow();
              }}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title={`Round Down to ${roundDownToEight(number)}`}
        subtitle={`Current is ${number}`}
        actions={
          <ActionPanel>
            <Action
              title="Round Down"
              onAction={async () => {
                const roundedDown = roundDownToEight(number);
                const frontmostApplication = await getFrontmostApplication();
                await Clipboard.paste(roundedDown.toString());
                await showHUD(`👟 Rounded down to ${roundedDown} and pasted to ${frontmostApplication.name}`);
                resetState();
                popToRoot();
                closeMainWindow();
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
