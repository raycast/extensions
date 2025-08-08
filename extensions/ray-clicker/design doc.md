# Ray Clicker: Game Design Document

## 1. Overview

Ray Clicker is a simple idle clicker game for Raycast with upgrade, made as a learning exercise for Raycast extensions development.

- **Three Trees:** Active (click power), Idle (currency/sec), Efficiency (global multipliers, QoL).
- **Scaling:** Exponential upgrade costs; milestone power spikes at key levels.
- **Prestige:** Reset for permanent perks; formula: `floor(sqrt(total_earned / 1e6))`.
- **Theme:** Productivity/automation vibes consistent with Raycast.

---

## 2. Core Gameplay Loop: Upgrades & Progression

The game is balanced around three main upgrade categories (or "trees"), each containing 50 sequential levels. Each category focuses on a different aspect of the game: active clicking, idle income, or global efficiency.

### 2.1. Cost Scaling

The cost for upgrades uses an exponential scaling formula to ensure a balanced progression curve and prevent linear buyouts.

**General Cost Formula:**

```
cost_n = base_cost * (cost_multiplier)^(n-1)
```

* **cost\_n:** The cost of the nth level of an upgrade.
* **base\_cost:** The initial cost of the upgrade at level 1.
* **cost\_multiplier:** The factor by which the cost increases for each subsequent level.
* **n:** The target upgrade level.

Each category uses a different base\_cost and cost\_multiplier to pace progression appropriately:

* **Active Upgrades:** Lower base cost, slower growth (e.g., `base_cost = 10`, `cost_multiplier ≈ 1.12–1.15`).
* **Idle Upgrades:** Higher base cost, moderate growth (e.g., `base_cost = 100`, `cost_multiplier ≈ 1.15–1.20`).
* **Efficiency Upgrades:** Highest cost, faster growth (e.g., `base_cost = 500`, `cost_multiplier ≈ 1.25–1.30`).

### 2.2. Milestone Bonuses

To reward long-term investment, milestone bonuses are granted at specific levels (e.g., levels 25 and 50), providing a significant, stacking multiplier (e.g., ×2) to that upgrade’s output. This creates satisfying breakthroughs in progression.

---

## 3. Upgrade Categories

### 3.1. Active Production Upgrades (Manual Clicking)

* **Purpose:** Boost the currency gained per click. Keeps active play relevant, especially in the early game and post-prestige.
* **Effect:** Each level increases the Click Value by a compounding percentage or a flat amount (e.g., +10% per level).
* **Scaling:** Starts with a low cost (e.g., 10 RayCoins) and a multiplier of \~1.12–1.15.
* **Milestones:** At levels 25 and 50, grant a further +100% click output multiplier on top of listed effects.

**Example Levels & Thematic Flavor:**

| Level | Name               | Effect                | Flavor                                                                             |
| ----- | ------------------ | --------------------- | ---------------------------------------------------------------------------------- |
| 1     | Home Row Novice    | +0.1 click value      | You’ve learned proper finger placement, yielding more output per keystroke.        |
| 5     | Ergonomic Keyboard | +50% click value      | Better hardware makes each click more productive.                                  |
| 10    | Shortcut Maestro   | ×2 click output       | You’ve mastered Raycast shortcuts, executing commands with blazing efficiency.     |
| 20    | Macro Automation   | +5 currency per click | You record macros that run on each click, packing more actions into one keystroke. |
| 30    | Hypertyping        | +300% click value     | Your typing speed is inhuman, every tap showers currency.                          |
| 40    | Neural Interface   | ×10 click output      | Direct brain-to-computer link – your thoughts translate into bursts of commands.   |
| 50    | Quantum Clicks     | ×100 click output     | Clicking tears reality. This is the pinnacle of active power, fitting for endgame. |

### 3.2. Idle Income Upgrades (Automation Generators)

* **Purpose:** Provide passive, automated income (currency/sec). Forms the core of idle gameplay.
* **Effect:** Each level increases the idle generation rate.
* **Scaling:** Starts more expensive (e.g., 100 RayCoins) with a multiplier of \~1.15–1.20.
* **Milestones:** At levels 25 and 50, grant a ×2 boost to idle output.

**Example Levels & Thematic Flavor:**

| Level | Name               | Effect              | Flavor                                                                              |
| ----- | ------------------ | ------------------- | ----------------------------------------------------------------------------------- |
| 1     | Basic Script       | +0.1/sec            | A simple Raycast script runs periodically, clicking for you.                        |
| 5     | Background Daemon  | +1/sec              | A background process handles tasks continuously.                                    |
| 10    | Cron Job Army      | +10/sec             | Multiple scheduled tasks now grind away every second.                               |
| 15    | AI Assistant       | +5% per level       | An AI learns to optimize idle gains, increasing efficiency.                         |
| 20    | Server Cluster     | +100/sec            | Cloud servers dedicated to running your Raycast commands nonstop.                   |
| 30    | Parallel Universe  | ×2 idle output      | You’ve tapped into a parallel dimension of computing – idle outputs are duplicated. |
| 40    | Quantum Automation | +100k/sec           | Quantum computers now generate absurd amounts of currency continuously.             |
| 50    | Skynet Singularity | ×10 idle production | Your automated systems become self-improving, exploding your passive income.        |

### 3.3. Efficiency & Multipliers Upgrades (Global Enhancements)

* **Purpose:** Powerful global upgrades like multipliers, cost reductions, and QoL features.
* **Effect:** Percentage-based boosts, cost reductions, or unlocks new mechanics.
* **Scaling:** The most expensive category with a steep cost curve (\~1.25+ multiplier).

**Example Levels & Thematic Flavor:**

| Level | Name               | Effect                            | Flavor                                                |
| ----- | ------------------ | --------------------------------- | ----------------------------------------------------- |
| 1     | Optimize Startup   | +10% global income                | Cleans up your system for a slight overall boost.     |
| 3     | Raycast Pro Mode   | -5% upgrade costs                 | Efficient workflows reduce effort needed to upgrade.  |
| 5     | Bulk Purchase      | Unlock buy 10 levels at once      | Quality-of-life feature for bulk purchases.           |
| 10    | Auto-Click Daemon  | Unlock auto-clicker (1/sec)       | Small active boost even when idle.                    |
| 15    | Lucky Commands     | 1% chance of ×10 bonus events     | Brings excitement with random Golden Command rewards. |
| 20    | AI Optimizer       | ×2 all outputs                    | AI fine-tunes every aspect of your setup.             |
| 25    | Time Dilation      | ×2 offline progress               | Earn twice the idle amount for time passed offline.   |
| 30    | Synergy Module     | +1% cross-boost per level         | Click and idle upgrades boost each other.             |
| 40    | Quantum Computing  | ×11 all income                    | Harness quantum tech to supercharge everything.       |
| 50    | Reality Alteration | Double every other upgrade effect | Capstone breaker for infinite scaling.                |

---

## 4. Prestige System: Endless Progression

### 4.1. Prestige Mechanics

When progression slows, the player can “Prestige” to:

* Reset all regular upgrades and currency.
* Earn permanent prestige currency (e.g., “Command Stars”).
* Spend this currency on powerful Prestige Upgrades that persist through all future runs.

**Prestige Points Formula:**

```
prestige_points = floor(sqrt(total_earned / 1e6))
```

### 4.2. Prestige Upgrades (50+)

A selection of permanent perks, unlocking new mechanics and boosts:

* Empowered Legacy: +100% all generation.
* Quick Start: Start with 50 currency per prestige level.
* Click Apprentice: +1 base click.
* Idle Apprentice: +0.1/sec base idle.
* Frugal Shopper: -2% upgrade costs per prestige.
* Faster Tick: Idle ticks twice as fast.
* … *(full list in annex)*

### 4.3. Unlock & Tier System

* **Early Prestiges (1–10):** Basic boosts and QoL features.
* **Mid-Tier (11–25):** New mechanics like Bulk Buyer Pro, Second Wind.
* **High-Tier (26–50):** Game-altering effects like Infinity Engine.
* **Capstone (50+):** Endgame loops like Ultimate Ascension.

---

## 5. Endless Play Design

* **Insane Numbers:** Exponential scaling to chase ever-larger values.
* **Layered Prestige:** Multiple prestige layers and meta-prestige.
* **Challenge Runs:** Optional self-imposed goals for expert players.

---

## 6. Raycast UI & API Implementation Notes

### Main Game Interface (`List`)

* **List Sections:** Active, Idle, Efficiency.
* **List Items:** Name, Level & Effect, Next Cost accessory.

### Purchasing Actions (`ActionPanel`)

* Buy 1, Buy 10 (unlocked via Bulk Purchase), Buy Max.

### Idle Progress (`MenuBarExtra`)

* Displays `RC: 1.45M (+1.2k/s)` in menu bar.
* Click to open main view.

### Prestige (`List`)

* View available prestige perks and spend Command Stars.

### Feedback (`Toast`)

* Success/failure toasts for purchases and events.

### Persistence (`LocalStorage`)

```ts
await LocalStorage.setItem("gameState", JSON.stringify(state));
```

* Calculate offline progress by timestamp diff.
