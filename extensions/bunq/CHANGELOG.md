# Changelog

## [1.0.0] - 2026-02-17

> First public release of the bunq extension for Raycast

### ✨ Features

#### 🏦 Banking & Accounts
- View all bunq accounts with real-time balances
- Browse transaction history with smart filtering (all/incoming/outgoing)
- Spending insights with categorized analysis
- Request statements in PDF, CSV, or MT940 format (available in bunq app)

#### 💳 Card Management
- View and manage physical & virtual cards
- Instant freeze/unfreeze functionality
- Generate temporary CVC2 codes for secure online payments
- Mastercard transaction history per card

#### 💸 Payments
- Send money to IBAN, email, or phone recipients
- Scheduled recurring payments (daily/weekly/monthly/yearly)
- Draft payments for joint account approval workflows
- Batch payments using CSV-style input

#### 📥 Receive Money
- Request payments via IBAN, email, or phone
- View and respond to incoming payment requests (pay/reject)
- Create shareable bunq.me payment links with optional amounts

#### 👤 Account Management
- View profile and environmental impact (🌳 trees planted!)
- Subscription and contract details
- SEPA direct debit mandate management
- API device management
- Invoice viewing and downloads

#### 🌍 Advanced Features
- Wise international transfer support
- Account sharing invites
- Activity events feed
- Auto-allocation rules
- Webhook/notification filter management

### 🔧 Technical
- Automatic RSA keypair generation on first use
- Secure device registration
- Session management with automatic refresh
- Request signing (RSA-SHA256)
