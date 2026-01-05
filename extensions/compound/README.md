# Compound Calculator for Raycast

Calculate compound interest and regular savings instantly with Raycast.

## Features

- **Compound Calculator**: Intuitive form input for calculations
- **Compound Quick**: Fast calculations with command arguments (for power users)
- **After-Tax Calculation**: Simple tax calculation on gains
- **Flexible Input**: Supports various formats ($, ¥, 万円, commas, etc.)
- **Multi-Language Support**: English and Japanese (日本語)

## Language Support

The extension supports **English** and **Japanese (日本語)**.

- **Default**: English
- **Change Language**: Go to Extension Preferences → Language / 言語

All UI elements, error messages, and output formats will be displayed in your selected language.

## Usage

### Compound Calculator (Form)

Launch `Compound Calculator` in Raycast and fill in the form.

| Field | Description | Example |
|-------|-------------|---------|
| Principal | Initial investment | 100000, $10,000, 10万円 |
| Rate | Annual interest rate (%) | 5, 5% |
| Period | Years | 10, 10y, 10年 |
| Monthly | Monthly contribution (optional) | 30000, $500 |
| Compound Frequency | Yearly/Monthly/Daily | Auto-monthly when contributions enabled |
| After-Tax | Apply tax to gains | Toggle on/off |
| Tax Rate | Tax percentage | Set in preferences or per-calculation |

### Compound Quick (Arguments)

Launch `Compound Quick` in Raycast and enter arguments separated by **spaces**.

#### Input Patterns

| Pattern | Example |
|---------|---------|
| rate years | `5% 10y` |
| principal rate years | `$10,000 5% 10y` |
| principal rate years monthly | `$10,000 5% 10y $500` |
| principal rate years monthly tax | `$10,000 5% 10y $500 20%` |

#### Supported Formats

- **Years**: `10y`, `10years`, `10年`
- **Months**: `6m`, `6months`, `6ヶ月`
- **Money**: `100000`, `100,000`, `$100`, `¥1000`, `10万円`
- **Key-value**: `p=10000 r=5 y=10 m=500 tax=20`

#### Key-Value Parameters

| Key | Description |
|-----|-------------|
| `p`, `principal` | Principal amount |
| `m`, `monthly` | Monthly contribution |
| `r`, `rate` | Annual rate (%) |
| `y`, `years` | Period (years) |
| `tax`, `taxRate` | Tax rate (%) - enables after-tax calculation |
| `freq` | Compound frequency (yearly/monthly/daily) |
| `currency` | Currency (JPY/USD/EUR) |
| `rounding` | Rounding method (floor/round/ceil) |

#### Examples

```bash
# English
5% 10y                          # Rate 5%, 10 years
$10,000 5% 10y                  # $10,000 principal
$10,000 5% 10years $500         # + $500/month contribution
$10,000 5% 10y $500 20%         # + 20% tax

# Japanese
5% 10年                         # 利率5%、10年
100万円 5% 10年                  # 元本100万円
100万円 5% 10年 3万円            # + 毎月3万円積立
100万円 5% 10年 3万円 20%        # + 税率20%

# Key-value format
p=10000 r=5 y=10 m=500 tax=20
```

## Formulas

### Principal Only (Compound Interest)
```
FV = P × (1 + R/n)^(n×t)
```
- P: Principal
- R: Annual rate (decimal)
- n: Compound frequency (yearly=1, monthly=12, daily=365)
- t: Period (years)

### With Monthly Contributions
```
Monthly rate: i = (1 + R)^(1/12) - 1
Principal: FV_p = P × (1 + i)^N
Contributions: FV_m = M × [(1 + i)^N - 1] / i
Total: FV = FV_p + FV_m
```
- M: Monthly contribution
- N: Number of months (years × 12)

### After-Tax Calculation
```
Total Contributions: Contrib = P + M × N
Gain: Gain = FV - Contrib
Tax: Tax = max(Gain, 0) × TaxRate
After-Tax: FV_after = FV - Tax
```

## Actions

Available actions in the result view:

- **Copy Result (Text)**: Copy main info as plain text
- **Copy Result (Markdown)**: Copy as Markdown
- **Copy Result (CSV)**: Copy as CSV (single row)
- **Paste Result**: Paste directly to active app

## Settings (Preferences)

| Setting | Options | Default |
|---------|---------|---------|
| Language | English / 日本語 | English |
| Default Currency | USD / EUR / JPY | USD |
| Default Tax Rate | 0-100% | Empty (0%) |
| Compound Frequency | Yearly / Monthly / Daily | Monthly |
| Rounding Method | Floor / Round / Ceiling | Round |

## License

MIT License

## Author

atsushi_kawamura
