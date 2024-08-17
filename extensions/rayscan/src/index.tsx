import { Action, ActionPanel, Detail, Icon, Image, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { getTransactions, openInTenderly, validateHash } from "./utils";
import { Transaction } from "./types";
import { network_configs } from "./networkConfig";

export default function Command() {
    const [searchText, setSearchText] = useState("");
    const { data, isLoading, error } = usePromise(getTransactions, [searchText], { execute: validateHash(searchText) });


    return <List onSearchTextChange={setSearchText} isLoading={isLoading} >
        {
            error && <List.Item
                title="An error occurred while fetching transactions"
                subtitle={error.message}
                icon={{ source: Icon.XMarkCircle, tintColor: "#DB4437" }}
            />
        }
        {!error && data?.transactions.map((transaction) => {
            const network = network_configs[transaction.network_id];
            return (
                <List.Item
                    key={`${transaction.network_id}:${transaction.hash}`}
                    title={transaction.hash}
                    subtitle={`${network.networkName}(${transaction.network_id})`}
                    icon={{ source: network.imageUrl, fallback: Icon.Network, mask: Image.Mask.RoundedRectangle }}
                    actions={
                        <ActionPanel title={`${transaction.network_id}:${transaction.hash}`}>
                            <Action.Push
                                title="Instant View"
                                target={<TransactionDetail transaction={transaction} />}
                                icon={Icon.Eye}
                            />
                            <Action.OpenInBrowser icon={Icon.ArrowNe} url={openInTenderly(transaction)} title="Open In Tenderly" />
                        </ActionPanel>
                    }
                />
            )
        }
        )}
    </List>;
}

export function TransactionDetail({
    transaction,
}: {
    transaction: Transaction;
}) {
    const network = network_configs[transaction.network_id];
    // Convert to a Date object
    const date = new Date(transaction.timestamp);

    // Format to a readable date
    const readableDate = date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        timeZoneName: 'short'
    });
    const now = new Date();
    const timeDifference = now.getTime() - date.getTime();

    // Convert to seconds, minutes, hours, days, etc.
    const secondsAgo = Math.floor(timeDifference / 1000);
    const minutesAgo = Math.floor(secondsAgo / 60);
    const hoursAgo = Math.floor(minutesAgo / 60);
    const daysAgo = Math.floor(hoursAgo / 24);

    let howAgo = '';
    if (daysAgo > 0) {
        howAgo = `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`;
    } else if (hoursAgo > 0) {
        howAgo = `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`;
    } else if (minutesAgo > 0) {
        howAgo = `${minutesAgo} minute${minutesAgo > 1 ? 's' : ''} ago`;
    } else {
        howAgo = `${secondsAgo} second${secondsAgo > 1 ? 's' : ''} ago`;
    }
    const meta = [
        `# Transaction Details`,
        `## General Information`,
        `- **Transaction Hash:** \`${transaction.hash}\``,
        `- **Network:** \`${network.networkName}\` \`${transaction.network_id}\``,
        `- **Block Hash:** \`${transaction.block_hash}\``,
        `- **Block Number:** \`${transaction.block_number.toLocaleString()}\``,
        `- **From:** \`${transaction.from}\``,
        `- **To:** \`${transaction.to}\``,
        `- **Nonce:** \`${transaction.nonce.toLocaleString()}\``,
        `- **Timestamp:** \`${readableDate} (${howAgo})\``,
        `## Gas Information`,
        `- **Gas Limit:** \`${transaction.gas.toLocaleString()}\``,
        `- **Gas Price:** \`${transaction.gas_price.toLocaleString()}\``,
        `- **Gas Fee Cap:** \`${transaction.gas_fee_cap}\``,
        `- **Gas Tip Cap:** \`${transaction.gas_tip_cap}\``,
        `- **Cumulative Gas Used:** \`${transaction.cumulative_gas_used}\``,
        `- **Gas Used:** \`${transaction.gas_used}\``,
        `- **Effective Gas Price:** \`${transaction.effective_gas_price}\``,
        `## Value and Input Data`,
        `- **Value:** \`${transaction.value}\``,
        `- **Input Data:** \`${transaction.input}\``,
        `## Additional Information`,
        `- **Transaction Index:** \`${transaction.index}\``,
        `- **Function Selector:** \`${transaction.function_selector}\``,
        `- **Deposit Transaction:** \`${transaction.deposit_tx}\``,
        `- **System Transaction:** \`${transaction.system_tx}\``,
        `- **Method:** \`${transaction.method}\``,
        `- **Access List:** \`${transaction.access_list}\``,
        `- **Status:** \`${transaction.status}\``,
        `- **Addresses:** \`${transaction.addresses}\``,
        `- **Contract IDs:** \`${transaction.contract_ids}\``,
        `- **Decoded Input:** \`${transaction.decoded_input}\``,
        `- **Call Trace:** \`${transaction.call_trace}\``
    ].join("\n\n");

    return (
        <Detail
            markdown={meta}
            actions={
                <ActionPanel>
                    <Action.OpenInBrowser url={openInTenderly(transaction)} title="Open In Tenderly" />
                </ActionPanel>
            }
        />
    );
}