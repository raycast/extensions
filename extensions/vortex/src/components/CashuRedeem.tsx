import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { CashuData } from "../types";
import { meltToken } from "../utils/cashuRedeemUtils";

export default function CashuRedeem({ redeemData }: { redeemData: CashuData }) {
  const [isLoading, setLoading] = useState(false);

  const handleMelt = async (amount: number) => {
    if (!redeemData) return;
    setLoading(true);
    try {
      const result = await meltToken(redeemData.data, amount);
      if (result) {
        await showToast(Toast.Style.Success, "Sats Received!");
        await popToRoot();
      }
    } catch (e) {
      console.error(e);
      // @ts-expect-error error type is undefined
      await showToast(Toast.Style.Failure, `Failed to melt token ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Withdraw" onAction={() => handleMelt(redeemData.amount)} />
        </ActionPanel>
      }
    >
      <Form.Separator />
      <Form.Description
        title="Cashu Token Details"
        text={`
             Withdraw Amount:⚡ ${redeemData.amount} sats
             Fee:⚡ ${redeemData.fee}
             Description: "Cashu Token Redeem"
            `}
      />
    </Form>
  );
}
