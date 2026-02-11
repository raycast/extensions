# Quick Toshl

A powerful Raycast extension for managing your [Toshl Finance](https://toshl.com) expenses, income, and budgets with both manual commands and AI-powered natural language interactions.

![Raycast](https://img.shields.io/badge/Raycast-Extension-FF6154)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

### Manual Commands

| Command | Description |
| ------- | ----------- |
| **Add Expense** | Quick form to add expenses with category, tags, account, and recurring options |
| **Add Income** | Quick form to add income entries |
| **Add Transfer** | Transfer money between accounts |
| **Recent Transactions** | View, edit, and delete recent transactions (beautifully grouped by date with summary headers) |
| **Search Entries** | Advanced filtering by date range, type, category, tags, account, and description |
| **View Planning** | View monthly/yearly spending plan and predictions (Pro feature) |
| **Budgets** | View your budget progress and spending limits |

### AI Tools (Raycast AI Chat)

Chat naturally with Raycast AI to manage your finances:

```text
"Add $50 for lunch today"
"Show my expenses this month"  
"What's my food budget?"
"List my categories"
```

| AI Tool | Description |
| ------- | ----------- |
| `add-expense` | Add expenses using natural language (e.g., "50k lunch") |
| `add-income` | Add income entries |
| `search-entries` | Search and filter transactions |
| `get-planning` | Get monthly/yearly financial plan and outlook |
| `get-budgets` | Check budget status |
| `list-categories-tags` | List categories, tags, and accounts |

### Special Features

- 🇻🇳 **Vietnamese Support**: AI understands shortcuts like "50k", "3tr", "5 triệu"
- 📅 **Smart Dates**: AI automatically detects dates like "today", "yesterday", "last Friday"
- 🔄 **Recurring Entries**: Daily, weekly, monthly, yearly repeats
- 💱 **Currency Symbols**: Automatic support for 50+ currency symbols ($, €, ₫, etc.)
- 🎯 **Auto-Currency**: Default currency is auto-detected from your Toshl settings
- 🔵 **Transfer Detection**: Blue icons for account-to-account transfers
- ⚡ **HTTP Caching**: Optimized performance using ETag and Last-Modified headers

---

## ⚙️ Configuration

### Required

- **Toshl API Key**: Get from [Toshl Developer Settings](https://developer.toshl.com/)

### Optional

- **Force Refresh Cache**: Clear cached data manually to force fresh fetch from API

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.
