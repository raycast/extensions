import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useState } from "react";
import { Hexagram, hexagrams } from "./hexagrams";

const lineTypes = {
  oldYang: "Old Yang",
  youngYin: "Young Yin",
  youngYang: "Young Yang",
  oldYin: "Old Yin",
};

interface Line {
  value: number;
  typeKey: keyof typeof lineTypes;
  isChanging: boolean;
}

function generateLine(): Line {
  const coin1 = Math.floor(Math.random() * 2);
  const coin2 = Math.floor(Math.random() * 2);
  const coin3 = Math.floor(Math.random() * 2);
  const sum = coin1 + coin2 + coin3;

  let typeKey: Line["typeKey"];
  let isChanging: boolean;

  switch (sum) {
    case 3:
      typeKey = "oldYang";
      isChanging = true;
      break;
    case 2:
      typeKey = "youngYin";
      isChanging = false;
      break;
    case 1:
      typeKey = "youngYang";
      isChanging = false;
      break;
    case 0:
      typeKey = "oldYin";
      isChanging = true;
      break;
    default:
      typeKey = "youngYang";
      isChanging = false;
  }

  return { value: sum, typeKey, isChanging };
}

function isYangLine(line: Line): boolean {
  return line.typeKey === "oldYang" || line.typeKey === "youngYang";
}

function calculateHexagram(lines: Line[]): Hexagram | null {
  let lowerValue = 0;
  let upperValue = 0;

  for (let i = 0; i < 3; i++) {
    if (isYangLine(lines[i])) {
      lowerValue += Math.pow(2, i);
    }
  }

  for (let i = 3; i < 6; i++) {
    if (isYangLine(lines[i])) {
      upperValue += Math.pow(2, i - 3);
    }
  }

  const hexagramIndex = (upperValue * 8 + lowerValue) % 64;
  return hexagrams[hexagramIndex] || hexagrams[0];
}

export default function Command() {
  const [lines, setLines] = useState<Line[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [hexagram, setHexagram] = useState<Hexagram | null>(null);
  const [isThrowing, setIsThrowing] = useState<boolean>(false);

  const handleThrowCoins = async () => {
    if (currentStep <= 6 && !isThrowing) {
      setIsThrowing(true);

      const delay = 1000 + Math.random() * 500;
      await new Promise((resolve) => setTimeout(resolve, delay));

      const newLine = generateLine();
      const newLines = [...lines, newLine];
      setLines(newLines);

      if (currentStep === 6) {
        const calculatedHexagram = calculateHexagram(newLines);
        setHexagram(calculatedHexagram);
      } else {
        setCurrentStep(currentStep + 1);
      }

      setIsThrowing(false);
    }
  };

  const handleReset = () => {
    setLines([]);
    setCurrentStep(1);
    setHexagram(null);
    setIsThrowing(false);
  };

  if (hexagram && lines.length === 6) {
    const changingLines = lines.filter((line) => line.isChanging);
    const hexagramDisplay = lines
      .slice()
      .reverse()
      .map((line, index) => {
        const position = 6 - index;
        const lineType = lineTypes[line.typeKey];
        const changingText = line.isChanging ? " (Changing)" : "";
        return `Line ${position}: ${lineType}${changingText}`;
      })
      .join("\n");

    const markdown = `# Hexagram ${hexagram.number}: ${hexagram.name}

**Pinyin:** ${hexagram.pinyin}  
**Meaning:** ${hexagram.meaning}

---

## Hexagram

\`\`\`
${hexagramDisplay}
\`\`\`

---

## Interpretation

${hexagram.description}

---

## Advice

According to this hexagram, ${hexagram.description}. Please carefully consider your current situation and take appropriate action.

${changingLines.length > 0 ? `\n**Changing Lines:** There are ${changingLines.length} changing lines, indicating dynamic changes in this hexagram.` : ""}
`;

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action
              title="Reset"
              icon={Icon.ArrowClockwise}
              onAction={handleReset}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isThrowing} searchBarPlaceholder="I Ching Divination">
      {lines.length === 0 && (
        <List.EmptyView
          icon={Icon.Coins}
          title={isThrowing ? "Throwing..." : `Throw ${currentStep} of 6`}
          description={isThrowing ? "Throwing coins, please wait..." : "Press Enter to throw coins"}
          actions={
            <ActionPanel>
              {!isThrowing && (
                <Action
                  title="Throw Coins"
                  icon={Icon.ArrowRight}
                  onAction={handleThrowCoins}
                  shortcut={{ modifiers: [], key: "enter" }}
                />
              )}
              <Action
                title="Reset"
                icon={Icon.ArrowClockwise}
                onAction={handleReset}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      )}

      {lines.length > 0 && (
        <List.Section title={`Lines (${lines.length}/6)`}>
          {lines.map((line, index) => {
            const lineType = lineTypes[line.typeKey];
            return (
              <List.Item
                key={index}
                title={`Line ${index + 1}: ${lineType}`}
                subtitle={line.isChanging ? "(Changing)" : ""}
                icon={Icon.Coins}
                actions={
                  <ActionPanel>
                    {currentStep <= 6 && !isThrowing && (
                      <Action
                        title="Throw Coins"
                        icon={Icon.ArrowRight}
                        onAction={handleThrowCoins}
                        shortcut={{ modifiers: [], key: "enter" }}
                      />
                    )}
                    <Action
                      title="Reset"
                      icon={Icon.ArrowClockwise}
                      onAction={handleReset}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
