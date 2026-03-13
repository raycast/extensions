import { Form } from "@raycast/api";
import { useState } from "react";

export default function Main() {
  const [ePF, setEntry] = useState("");
  const [slPF, setSl] = useState("");
  const [tpPF, setTp] = useState("");
  const [rAF, setRisk] = useState("");
  const entryPriceField = parseFloat(ePF);
  const slPriceField = parseFloat(slPF);
  const tpPriceField = parseFloat(tpPF);
  const riskAmountField = parseFloat(rAF);
  let positionSize = 0;
  let rrRatio = 0;

  if (isNaN(entryPriceField) || isNaN(slPriceField) || isNaN(tpPriceField) || isNaN(riskAmountField)) {
    positionSize = 0;
    rrRatio = 0;
  } else {
    positionSize = Math.abs(riskAmountField / (entryPriceField - slPriceField));
    positionSize = parseFloat(positionSize.toFixed(3));
    rrRatio = (tpPriceField - entryPriceField) / (entryPriceField - slPriceField);
    rrRatio = parseFloat(rrRatio.toFixed(2));
  }

  return (
    <Form>
      <Form.TextField
        id="entryPriceField"
        title="Entry Price"
        placeholder="Entry Price for the setup"
        onChange={setEntry}
      />
      <Form.TextField
        id="slPriceField"
        title="Stop-Loss Price"
        placeholder="Stop-Loss Price for the setup"
        onChange={setSl}
      />
      <Form.TextField
        id="tpPriceField"
        title="Take-Profit Price"
        placeholder="Take-Profit Price for the setup"
        onChange={setTp}
      />
      <Form.TextField
        id="riskAmountField"
        title="Risk Amount"
        placeholder="The amount you'll lose, if position hits stop-loss price."
        onChange={setRisk}
      />

      <Form.Separator />

      <Form.TextField id="positionSize" title="Position Size" value={positionSize.toString()} />
      <Form.TextField
        id="riskRewardRatio"
        title="Risk-Reward Ratio"
        value={rrRatio.toString()}
        placeholder="Amount you'll make when price hits take profit price."
      />
    </Form>
  );
}
