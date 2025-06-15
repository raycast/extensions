import { Color, Icon, List } from "@raycast/api";
import { ParsedTransactionMeta } from "@solana/web3.js";
import { FC, Fragment } from "react";
import { Account } from "../../types";

interface ITokenBalancesSectionProps {
  meta: ParsedTransactionMeta;
  accounts: Account[];
}

export const TokenBalancesSection: FC<ITokenBalancesSectionProps> = ({ meta, accounts }) => {
  return (
    <List.Item
      title="Token Balances"
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              {meta?.postTokenBalances?.map((balance, index) => {
                const preTokenBalanceComputed =
                  (meta?.preTokenBalances?.[index] && meta?.preTokenBalances?.[index].uiTokenAmount?.uiAmount) || 0;

                const change =
                  balance.uiTokenAmount.uiAmount &&
                  ((balance.uiTokenAmount.uiAmount - preTokenBalanceComputed) as false | number);
                return (
                  <Fragment key={index}>
                    <List.Item.Detail.Metadata.Label title="Address" text={accounts[index].pubkey} key={index} />
                    <List.Item.Detail.Metadata.Label title="Pre Balance" text={preTokenBalanceComputed.toString()} />
                    <List.Item.Detail.Metadata.Label title="Post Balance" text={balance.uiTokenAmount.uiAmountString} />
                    {change && (
                      <List.Item.Detail.Metadata.Label
                        title="Change"
                        text={change.toString()}
                        icon={{
                          source:
                            change === 0
                              ? Icon.CircleFilled
                              : change > 0
                                ? Icon.ArrowUpCircleFilled
                                : Icon.ArrowDownCircleFilled,
                          tintColor: change === 0 ? Color.Blue : change > 0 ? Color.Green : Color.Red,
                        }}
                      />
                    )}
                    <List.Item.Detail.Metadata.Separator />
                  </Fragment>
                );
              })}
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
};
