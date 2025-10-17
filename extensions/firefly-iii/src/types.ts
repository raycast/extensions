export enum AccountType {
    asset="asset",
    expense="expense",
    import="import",
    revenue="revenue",
    cash="cash",
    liability="liability",
    liabilities="liabilities",
    "initial-balance"="initial-balance",
    reconciliation="reconciliation",
}
export type Account = {
    type: "accounts";
    id: string;
    attributes: {
        name: string;
        type: AccountType;
    }
}

export enum TransactionType {
    withdrawal = "withdrawal",
    deposit = "deposit",
    transfer = "transfer",
    reconciliation = "reconciliation",
    "opening balance" = "        -balance",
}
type TransactionSplit = {
    type: TransactionType
    "currency_symbol": string
    "currency_decimal_places": number
    amount: string
    description: string;
}
export type Transaction = {
    type: "transactions";
    id: string;
    attributes: {
        transactions: [TransactionSplit]
    }
}

export type PaginatedResult<T> = {
    data: T[]
    meta: {
        "pagination": {
            "total": number;
            "count": number;
            "per_page": number;
            "current_page": number;
            "total_pages": number;
        }
    }
}