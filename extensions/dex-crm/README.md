# Dex CRM for Raycast

> Search, view, and manage your [Dex CRM](https://getdex.com) contacts directly from Raycast

[![CI](https://github.com/YOUR_USERNAME/dex-raycast-extension/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/dex-raycast-extension/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org/)

## ✨ Features

### 🔍 Search Contacts

- **Lightning-fast search** with smart caching (5-minute cache)
- Search by name, email, or job title
- Navigate through 10,000+ contacts instantly
- Quick actions: View details, Edit, Delete

### 👤 Contact Management

- **List-based navigation** with keyboard shortcuts
- View complete contact information (emails, phones, social profiles)
- **Quick actions** directly from contact view:
  - Send email, Make phone call, Send SMS, Open WhatsApp
  - View LinkedIn profile
- **Edit name with smart suggestions** from email addresses (Cmd+E)
- Add, edit, and delete contacts

### 📝 Notes & Reminders

- Add quick notes to contacts (Cmd+N)
- Timestamped note history
- **Smart reminder management**:
  - Filter by upcoming, overdue, or all
  - Mark as done (Cmd+D)
  - Snooze options: 1 day, 3 days, 1 week
- Overdue reminders highlighted in red

### 🎯 Recent Contacts

- View recently modified contacts
- Quick access to your most active relationships

## 📦 Installation

### From Raycast Store (Recommended)

1. Open Raycast
2. Search for "Dex CRM"
3. Click "Install"

### Manual Installation

```bash
git clone https://github.com/BaNburger/dex-raycast-extension.git
cd dex-raycast-extension
npm install
npm run build
# Import into Raycast: Extensions → Add Extension → Select folder
```

## 🔑 Setup

1. Get your Dex API key from [https://app.getdex.com/settings/integrations](https://app.getdex.com/settings/integrations)
2. Open Raycast → Extensions → Dex CRM → Preferences (⌘,)
3. Paste your API key
4. Start using the extension!

## 🎮 Commands & Keyboard Shortcuts

### Search Contacts

- `↑↓` Navigate | `⏎` View details | `⌘E` Edit | `⌘⌫` Delete

### Manage Reminders

- `⌘D` Mark done | `⌘O` View contact | `⌘M` Email | `⌘E` Edit
- `⌘⇧1/3/7` Snooze 1/3/7 days | `⌘N` Add reminder

### Contact Details

- `⌘E` Edit name | `⌘N` Add note | `⌘O` Open in Dex
- `⏎` Primary action (email/call) | `⌘C` Copy

## 🏗️ Development

```bash
npm install          # Install dependencies
npm run dev         # Start development
npm test            # Run tests
npm run test:coverage  # Coverage report
npm run lint        # Check code style
```

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

## 📄 License

MIT License - see [LICENSE](LICENSE)

## 📞 Support

- Issues: [GitHub Issues](https://github.com/BaNburger/dex-raycast-extension/issues)
- Dex: [getdex.com/support](https://getdex.com/support)

---

Made with ❤️ for Dex and Raycast
