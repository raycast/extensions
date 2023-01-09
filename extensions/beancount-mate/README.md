# Beancount Mate

Beancount Mate is the best teammate for double-entry bookkeeping.

With Beancount Meta, you can:

1. Quick generate transcation record. (use costflow syntax)
2. Save record to your beancount journal file.

To get started, you need to create a costflow config file firstly.

```bash
mkdir ~/.costflow
touch ~/.constflow/config.json
```

```json
{
  "mode": "beancount",
  "currency": "CNY",
  "timezone": "Asia/Hong_Kong",
  "tag": "#costflow",
  "link": "",
  "indent": 2,
  "lineLength": 60,
  "insertTime": "",
  "account": {
    "boc": "Assets:CN:BOC",
    "bofa": "Assets:US:BofA:Checking",
    "cloud": "Expenses:Cloud",
    "cmb": "Liabilities:CreditCard:CMB",
    "eob": "Equity:Opening-Balances",
    "food": "Expenses:Food",
    "phone": "Expenses:Home:Phone",
    "rent": "Expenses:Home:Rent",
    "rx": "Assets:Receivables:X",
    "ry": "Assets:Receivables:Y",
    "subscription": "Expenses:Subscriptions",
    "visa": "Liabilities:CreditCard:Visa"
  },
  "formula": {
    "☕️": "@Leplays ☕️ {{ amount }} Liabilities:CreditCard:Visa > Expenses:Coffee",
    "c2f": "{{ pre }} cmb > food",
    "aws": "@AWS {{ amount }} USD visa > cloud",
    "spotify": "@Spotify 15.98 USD visa > subscription"
  }
}
```
