import { Form, ActionPanel, Action, Detail, useNavigation } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const { push } = useNavigation();
  const [input, setInput] = useState("");

  const handleSubmit = () => {
    const [entryPrice, stopLoss, target] = input.split(" ").map(parseFloat);

    if (isNaN(entryPrice) || isNaN(stopLoss) || isNaN(target)) {
      push(<Detail markdown="# ❌ Invalid input. Please enter valid numbers separated by spaces." />);
      return;
    }
    const capital = 10000;
    const risk_per_trade = 0.02;
    const risk = entryPrice - stopLoss;
    const reward = target - entryPrice;
    const riskRewardRatio = reward / risk;
    const positionSize = capital * risk_per_trade / risk;

    const result = `
# 📊 Calculation Results
**Entry Price:** \`${entryPrice}\`
**Stop Loss:** \`${stopLoss}\`
**Target:** \`${target}\`

## 📉 Risk and Reward
- **Risk:** \`${risk}\`
- **Reward:** \`${reward}\`
- **Risk-Reward Ratio:** \`${riskRewardRatio.toFixed(2)}\`

## 📈 Position Size
- **Position Size:** \`${positionSize.toFixed(2)}\`
    `;

    push(<Detail markdown={result} />);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Calculate" onAction={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="input"
        title="Entry Price, Stop Loss, Target"
        placeholder="e.g. 100 90 120"
        value={input}
        onChange={setInput}
      />
    </Form>
  );
}