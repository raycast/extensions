# Currency Converter

Real-time currency conversion in Raycast, powered by [freecurrencyapi.com](https://freecurrencyapi.com).

Convert any amount between **44+ currencies** with live exchange rates, mark your favorites, and get the result with a single keystroke — all without leaving your keyboard.

---

## ⚙️ Setup — Get Your Free API Key

This extension uses **freecurrencyapi.com** to fetch live rates. The free plan provides **5,000 requests per month** (more than enough for personal use), and the cache built into this extension keeps API calls minimal.

### 1. Create a free account

1. Go to **[freecurrencyapi.com](https://app.freecurrencyapi.com/register)** and sign up — no credit card required.
2. Confirm your email.

### 2. Copy your API key

1. Open your dashboard at **[app.freecurrencyapi.com/dashboard](https://app.freecurrencyapi.com/dashboard)**.
2. Copy the API key shown on the page (it starts with `fca_live_…`).

### 3. Paste it into Raycast

1. Open Raycast → run any of the **Currency Converter** commands.
2. The first time, Raycast will prompt for your API key — paste it and press **⌘ Enter**.
3. Done! The extension will remember your key.

> If you ever need to update or replace the key, open Raycast → **⌘ ,** → **Extensions** → **Currency Converter** → paste the new key in **Free Currency API Key**.

---

## 🚀 Commands

### Convert Currency
Type an amount and instantly see the conversion to every supported currency. Pin your favorites to the top.

- Search bar = the amount you want to convert
- Top-right dropdown = source currency
- Each list item shows the converted value + the rate
- **⌘ F** — toggle favorite
- **⌘ C** — copy converted value
- **⌘ ⇧ C** — copy full result (`100 USD = 502.30 BRL`)
- **⌘ R** — refresh rates

### Quick Convert
A one-shot conversion via Raycast arguments, perfect for quick lookups.

1. Open Raycast → type **Quick Convert**
2. Fill in: `amount`, `from` (e.g. USD), `to` (e.g. BRL)
3. Press **⏎** — get the result, the rate, and the inverse rate

If you leave `from` or `to` empty, the extension uses the defaults from your preferences.

### Latest Rates
Browse all current exchange rates for a chosen base currency.

- Use the dropdown to switch the base currency
- Filter the list with the search bar
- **⌘ C** copies the exact rate

---

## 🎛️ Preferences

| Preference | Default | Description |
|---|---|---|
| **Free Currency API Key** | _(required)_ | Your key from freecurrencyapi.com |
| **Default From Currency** | `USD` | Pre-selected source currency |
| **Default To Currency** | `BRL` | Pre-selected target currency |
| **Cache Duration (minutes)** | `30` | How long to reuse fetched rates before re-querying the API |

---

## 💱 Supported Currencies

44 currencies including USD 🇺🇸, EUR 🇪🇺, GBP 🇬🇧, JPY 🇯🇵, CNY 🇨🇳, BRL 🇧🇷, ARS 🇦🇷, MXN 🇲🇽, CAD 🇨🇦, AUD 🇦🇺, CHF 🇨🇭, INR 🇮🇳, KRW 🇰🇷, SGD 🇸🇬, HKD 🇭🇰, ZAR 🇿🇦, TRY 🇹🇷, RUB 🇷🇺, AED 🇦🇪, SAR 🇸🇦, ILS 🇮🇱, THB 🇹🇭, MYR 🇲🇾, IDR 🇮🇩, PHP 🇵🇭, VND 🇻🇳, and more.

---

## 🔒 Privacy

- Your API key is stored securely by Raycast.
- Requests go directly from your machine to `api.freecurrencyapi.com`.
- No analytics, no telemetry, no third parties.

---

## 🇧🇷 Português

Esta extensão converte moedas em tempo real usando o **freecurrencyapi.com**.

**Configuração:**
1. Crie uma conta gratuita em [freecurrencyapi.com](https://app.freecurrencyapi.com/register) (não precisa cartão).
2. Copie sua chave API no [dashboard](https://app.freecurrencyapi.com/dashboard).
3. Cole no Raycast quando ele pedir (ou em **⌘ ,** → **Extensions** → **Currency Converter**).

**Comandos:**
- **Convert Currency** — digite o valor na barra, escolha a moeda no dropdown, veja todas as conversões na lista.
- **Quick Convert** — conversão rápida com argumentos: `valor`, `de`, `para`.
- **Latest Rates** — explore as cotações de uma moeda base.

Plano gratuito da API: **5.000 requisições/mês** (cache de 30 minutos integrado economiza chamadas).

---

## 🙋 Issues / Feedback

Found a bug or want a new currency added? Open an issue on the [GitHub repo](https://github.com/raycast/extensions).
