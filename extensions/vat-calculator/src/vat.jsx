import { List, Action, ActionPanel } from "@raycast/api";
import { getVAT, numberWithVAT, getNetPrice } from "./lib/vat";
import { useState } from "react";

export default function calculateVAT() {
  const [number, setNumber] = useState(null);

  return (
    <List searchBarPlaceholder="Enter the number you want VAT added to" onSearchTextChange={(num) => setNumber(num)}>
      {number && (
        <List.Section title="Results">
          <List.Item title={"Gross Value: " + numberWithVAT(number)} actions={resultActions(numberWithVAT(number))} />
          <List.Item title={"VAT: " + getVAT(number)} actions={resultActions(getVAT(number))} />
          <List.Item title={"NET price: " + getNetPrice(number)} actions={resultActions(getNetPrice(number))} />
        </List.Section>
      )}
    </List>
  );
}

function resultActions(result) {
  return (
    <ActionPanel>
      <Action.CopyToClipboard content={result} />
      <Action.Paste content={result} />
    </ActionPanel>
  );
}
