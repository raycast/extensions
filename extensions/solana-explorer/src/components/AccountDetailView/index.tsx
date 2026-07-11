import { Action, ActionPanel, List, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Connection, PublicKey } from "@solana/web3.js";
import { FC, useRef } from "react";
import getCluster from "../../utils/getCluster";
import { DetailsSection } from "./DetailsSection";
import { TransactionsSection } from "./TransactionsSection";

interface IAccountDetailViewProps {
  pubkey: string;
  connection: Connection;
}

const AccountDetailView: FC<IAccountDetailViewProps> = ({ pubkey, connection }) => {
  const abortable = useRef<AbortController>();

  const {
    isLoading: isLoadingAccount,
    data: accData,
    revalidate: revalidateAccount,
  } = useCachedPromise(
    async (address: string) => {
      const account = await connection.getAccountInfo(new PublicKey(address));
      return account;
    },
    [pubkey],
    { abortable },
  );

  const {
    isLoading: isLoadingTransactions,
    data: transactionsData,
    revalidate: revalidateTransactions,
  } = useCachedPromise(
    async (address: string) => {
      const transactionsList = await connection.getSignaturesForAddress(new PublicKey(address));
      return transactionsList;
    },
    [pubkey],
    { abortable },
  );

  const revalidateAll = () => {
    revalidateAccount();
    revalidateTransactions();
  };

  const { pop } = useNavigation();

  return (
    <List
      isShowingDetail
      searchBarPlaceholder={pubkey}
      filtering={false}
      onSearchTextChange={() => pop()}
      isLoading={isLoadingAccount || isLoadingTransactions}
      actions={
        <ActionPanel>
          <Action title="Reload" onAction={() => revalidateAll()} />
        </ActionPanel>
      }
    >
      <DetailsSection accData={accData} pubkey={pubkey} cluster={getCluster(connection.rpcEndpoint)} />
      <TransactionsSection
        connection={connection}
        transactionsData={transactionsData}
        cluster={getCluster(connection.rpcEndpoint)}
      />
    </List>
  );
};

export default AccountDetailView;
