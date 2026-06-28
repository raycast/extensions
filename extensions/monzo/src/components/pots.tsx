import { FC } from "react";
import { List, Icon, Color } from "@raycast/api";
import { Monzo } from "@marceloclp/monzojs";

import { formatCurrency } from "../lib/formatting";

type PotProps = { pot: Monzo.Pot };

export const PotItem: FC<PotProps> = ({ pot }) => {
  const icon = pot.has_virtual_cards ? Icon.CreditCard : Icon.Coins;
  return (
    <List.Item
      title={pot.name}
      icon={{ source: icon, tintColor: Color.Yellow }}
      detail={<PotDetail pot={pot} />}
    />
  );
};

const PotDetail: FC<PotProps> = ({ pot }) => {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Balance"
            text={formatCurrency(pot.balance, pot.currency)}
          />
          <List.Item.Detail.Metadata.Separator />
          {pot.goal_amount && (
            <List.Item.Detail.Metadata.Label
              title="Goal"
              text={formatCurrency(pot.goal_amount, pot.currency)}
            />
          )}
          {pot.round_up && (
            <List.Item.Detail.Metadata.Label title="Rounding up into this pot" />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
};
