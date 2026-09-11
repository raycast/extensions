# Easy Invoice

A Raycast extension for generating professional PDF invoices locally. Built for UK freelancers and small businesses using GBP.

## Features

- **Create Invoice** - Fill in a form, get a PDF. Invoices are numbered automatically and saved to a folder organised by year.
- **List Invoices** - Browse, filter, and manage all your invoices. Mark them as draft, sent, or paid. Open PDFs or copy summaries.
- **Export Invoices** - Export filtered invoice data as CSV or a PDF summary report. Useful for tax returns and bookkeeping.
- **Manage Clients** - Save client details (name, contact, email, address) so you can reuse them across invoices. New clients can also be added inline when creating an invoice.

## Setup

After installing, open Raycast preferences for Easy Invoice and fill in:

- **Business details** - Name, address, email, phone
- **Bank details** - Bank name, account name, sort code, account number (printed on invoices for payment)
- **Invoice settings** - Prefix (e.g. INV), starting number, save location
- **Payment terms** - Default days until due, optional custom terms text
- **VAT** (optional) - Registration number, rate, whether to apply by default

## Usage

### Creating an invoice

1. Open "Create Invoice" from Raycast
2. Select an existing client or add a new one inline
3. Set the invoice and due dates
4. Add one or more line items (description, quantity, rate)
5. Toggle VAT if needed
6. Submit to generate the PDF

After creation you can open the PDF, reveal it in Finder, or copy the file path.

### Managing invoices

Use "List Invoices" to see all invoices. Filter by status (draft/sent/paid) or year using the dropdown. From any invoice you can:

- Open or reveal the PDF
- Change the status
- View full details
- Delete the invoice and its PDF

### Keyboard shortcuts

| Shortcut      | Action                      |
| ------------- | --------------------------- |
| Cmd+L         | Add line item (create form) |
| Cmd+Shift+L   | Remove last line item       |
| Cmd+D         | View invoice details        |
| Cmd+O         | Open in Finder              |
| Cmd+C         | Copy file path              |
| Cmd+Shift+C   | Copy invoice summary        |
| Cmd+S         | Mark as sent                |
| Cmd+Shift+P   | Mark as paid                |
| Cmd+Backspace | Delete invoice              |

## How it works

- Invoices and clients are stored in Raycast's LocalStorage (no external database)
- PDFs are generated locally using PDFKit with Helvetica fonts
- Files are saved to your configured directory, organised into year subfolders
- Invoice numbers auto-increment and never reuse a number, even if an invoice is deleted
