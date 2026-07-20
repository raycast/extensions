import { Action, ActionPanel, List, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Connection } from "@solana/web3.js";
import { useRef, useState } from "react";
import { Account } from "../../types";
import { AccountsSection } from "./AccountsSection";
import { TokenBalancesSection } from "./TokenBalancesSection";
import { DetailsSection } from "./DetailsSection";
import getCluster from "../../utils/getCluster";

interface Props {
  signature: string;
  connection: Connection;
}

const TransactionDetailView = ({ signature, connection }: Props) => {
  const abortable = useRef<AbortController>();
  const [accounts, setAccounts] = useState<Account[]>();

  const { isLoading, data, revalidate } = useCachedPromise(
    async (sig: string) => {
      const transaction = await connection.getParsedTransaction(sig);

      if (!transaction) {
        throw Error("Transaction not found");
      }

      const {
        meta,
        transaction: {
          message: { accountKeys },
        },
      } = transaction;

      if (!meta) {
        throw Error("Transaction metadata not found");
      }

      const { preBalances, postBalances } = meta;

      if (!preBalances || !postBalances) {
        throw Error("Transaction balances not found");
      }

      const accounts = accountKeys.map((account, index) => {
        return {
          pubkey: account.pubkey.toString(),
          isSigner: account.signer,
          isWritable: account.writable,
          preBalance: preBalances[index],
          postBalance: postBalances[index],
          balanceChange: postBalances[index] - preBalances[index],
        };
      });

      setAccounts(accounts);

      return transaction;
    },
    [signature],
    { abortable },
  );
  const { pop } = useNavigation();

  return (
    <List
      isShowingDetail
      searchBarPlaceholder={signature}
      filtering={false}
      onSearchTextChange={() => pop()}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Reload" onAction={() => revalidate()} />
        </ActionPanel>
      }
    >
      {data && (
        <>
          <DetailsSection data={data} sig={signature} cluster={getCluster(connection.rpcEndpoint)} />

          {data.meta?.postTokenBalances && data.meta.postTokenBalances.length > 0 && accounts && (
            <TokenBalancesSection meta={data.meta} accounts={accounts} />
          )}

          <AccountsSection accounts={accounts} connection={connection} cluster={getCluster(connection.rpcEndpoint)} />
        </>
      )}
    </List>
  );
};

export default TransactionDetailView;
