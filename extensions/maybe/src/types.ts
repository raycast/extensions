export type Account = {
    "id": string
    "name": string
    "balance": string
    "currency": string
    "classification": string
    "account_type": string
}
export type Transaction = {
      "id": string
      "date": string
      "amount": string
      "currency": string
      "name": string
      "notes": string
      "classification": string
      "account": Pick<Account, "id"|"name"|"account_type">
    //   "category": null,
    //   "merchant": null,
    //   "tags": [],
    //   "transfer": null,
      "created_at": string
      "updated_at": string
    }
export type PaginationInfo ={
    "pagination": {
        "page": 1,
        "per_page": 25,
        "total_count": 3,
        "total_pages": 1
  }
}