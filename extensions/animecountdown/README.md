# 📺 Anime Countdown for Raycast

Track your favorite upcoming and trending anime with live countdown timers directly from Raycast. Never miss an episode again!

## ✨ Features

- **Live Countdowns**: Real-time updates for the next air date of your favorite series.
- **Dual Layouts**: Switch between a visual **Grid View** (with posters) and a space-efficient **List View**.
- **Trending & Upcoming**: Browse what's popular right now or see what's airing soon.
- **Smart Sorting**: Manually toggle sorting by "Hype" (trending percentage) to find the most anticipated shows.
- **Offline Resiliency**: Built-in caching ensures you can see your last fetched data even when offline.
- **Highly Customizable**: Tailor the interface to your preference with adjustable grid columns and title truncation.

## Screencast
<img width="750" height="476" alt="Screenshot 2026-02-22 at 6 01 26 AM" src="https://github.com/user-attachments/assets/a009462f-ea62-49bd-9d0b-df70322dce55" />

<img width="751" height="480" alt="Screenshot 2026-02-22 at 6 01 41 AM" src="https://github.com/user-attachments/assets/9345f4eb-ee70-49bf-8623-b66a2696a45c" />

<img width="754" height="482" alt="Screenshot 2026-02-22 at 6 01 59 AM" src="https://github.com/user-attachments/assets/615a7094-92bd-4903-93a6-d38680b61731" />

<img width="752" height="480" alt="Screenshot 2026-02-22 at 6 02 22 AM" src="https://github.com/user-attachments/assets/dffc540d-e0c6-44ea-8948-9395c7871e5f" />

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Enter` | Open anime details on website |
| `Cmd + Enter` | Copy anime URL to clipboard |
| `Cmd + Shift + L` | Toggle Layout (List ↔ Grid) |
| `Cmd + Shift + S` | Toggle Sort by Hype (Trending view only) |
| `Cmd + V` | Switch Section (Trending ↔ Upcoming) |
| `Cmd + R` | Refresh Data |

## ⚙️ Configuration

You can customize the extension behavior via Raycast Preferences:

- **Default Layout**: Choose between 'List' or 'Grid' as your starting view.
- **Default View**: Set 'Trending' or 'Upcoming' as the initial section.
- **Grid Columns**: Adjust the number of columns in Grid view (default: 4).
- **Truncation Length**: Set the maximum title length for List view (default: 35).

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v16.10.0 or later)
- [Raycast](https://www.raycast.com/)

### Development

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/animecountdown.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the extension in development mode:
   ```bash
   npm run dev
   ```

## 🏗️ Architecture

This extension follows **SOLID** principles and a modular architecture:
- **Adapters**: Handle networking and data source specifics (`IAnimeAdapter`).
- **Parsers**: Decoupled HTML scraping logic.
- **Services**: Business logic and data orchestration.
- **Models**: Rich data objects with helper methods (`AnimeItem`).

## 📄 License

MIT © [Moksh](https://github.com/mokshkori)