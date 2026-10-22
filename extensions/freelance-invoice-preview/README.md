# Invoice Preview

A Raycast extension for freelancers: paste invoice data as JSON, get an instant
formatted preview, then copy or save it as a clean, print-ready HTML invoice.

- No account, no sign-up, no upload — everything runs locally.
- Same zero-dependency rendering logic as [freelance-invoice-js](https://github.com/kleogeos/freelance-invoice-js)
  and the [VS Code extension](https://github.com/kleogeos/freelance-invoice-vscode), kept consistent across all three.

## Usage

1. Run **Preview Invoice** from Raycast.
2. Paste JSON in this shape:

```json
{
  "invoice_number": "INV-0001",
  "from": "Your Name",
  "to": "Client Name",
  "date": "2026-10-23",
  "due_date": "2026-11-06",
  "items": [
    { "description": "Design work", "qty": 10, "rate": 50 },
    { "description": "Development", "qty": 20, "rate": 60 }
  ],
  "tax_rate": 0,
  "notes": "Thanks for your business!"
}
```

3. Hit **Preview Invoice** to see the formatted result.
4. From there: **Copy HTML** to paste into an email/doc, or **Save HTML to Downloads**.

## More free tools for freelancers

- [freelancer-tools](https://kleogeos.github.io/freelancer-tools/) — invoice generator, currency converter, late-fee calculator and more
- [freelance-invoice-js](https://github.com/kleogeos/freelance-invoice-js) — the same renderer as a CLI/npm package
