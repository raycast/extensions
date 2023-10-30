import { List, getPreferenceValues, Action, ActionPanel } from "@raycast/api";
import { useState } from "react";

export default function calculateVAT() {
  const VAT = Number(getPreferenceValues().vat);
  const [number, setNumber] = useState(null);

  return (
    <List
      searchBarPlaceholder="Enter the number you want VAT added to"
      onSearchTextChange={(num) => setNumber(num)}
    >
      {number && (
        <List.Section title="Results">
          <List.Item title={"Number with VAT: " + numberWithVAT(number, VAT)} actions={resultActions(numberWithVAT(number, VAT))}/>
          <List.Item title={"VAT: " + getVAT(number, VAT)} actions={resultActions(getVAT(number, VAT))}/>
        </List.Section> 
      )}
    </List>
  );
}

function equationToNumber(equation){
    try{
        if(equation.match(/[a-zA-Z]/g) != null){
            return 0;
        }
        return safeEval(equation);
    }catch{
        return 0;
    }
}

function getVAT(number, vat, keepAsNumber){
    number = equationToNumber(number);
    if(keepAsNumber){
        return ((vat / 100) * number);
    }
    return ((vat / 100) * number).toFixed(2);
}

function safeEval(code){
    return Function(`return ${code}`)();
}

function numberWithVAT(number, vat){
    return (getVAT(number, vat, true) + equationToNumber(number)).toFixed(2);
}

function resultActions(result){
    return (
        <ActionPanel>
            <Action.CopyToClipboard content={result}/>
            <Action.Paste content={result}/>
        </ActionPanel>
    )
}