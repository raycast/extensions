# Electricity Prices

View electricity prices from Nordpool directly in Raycast. See current price, next 24 hours, and cheapest hours for **20+ regions** across Europe.

## Features

- **View Prices**: See current and upcoming prices with **smart color coding** (Cheap/Average/High/Expensive)
- **Price Chart**: Visual ASCII chart of the day's prices to plan your consumption
- **Menu Bar**: Monitor the current price at a glance from your menu bar
- **Smart Recommendations**: Get instant advice on whether to use electricity now or wait for a cheaper hour
- **Best Window Finder**: Find the cheapest consecutive hours for your planned consumption

## Supported Regions

🇪🇪 Estonia • 🇱🇻 Latvia • 🇱🇹 Lithuania • 🇫🇮 Finland  
🇸🇪 Sweden (SE1-SE4) • 🇳🇴 Norway (NO1-NO5) • 🇩🇰 Denmark (DK1-DK2)  
🇩🇪 Germany • 🇳🇱 Netherlands • 🇧🇪 Belgium • 🇦🇹 Austria • 🇫🇷 France • 🇵🇱 Poland

## Configuration

Open extension preferences to customize:

| Setting | Description | Default |
|---------|-------------|---------|
| **Region** | Your electricity price area | Estonia |
| **VAT Rate** | VAT percentage for your country | 24% |
| **Cheap Threshold** | Below this = cheap (green) | 5 s/kWh |
| **Average Threshold** | Below this = average (blue) | 10 s/kWh |
| **High Threshold** | Below this = high (orange), above = expensive (red) | 20 s/kWh |

## Usage

### View Prices
Run the "View Prices" command to see a list of hourly prices with recommendations.

### Price Chart
Run the "Price Chart" command to see a visual representation of today's prices.

### Menu Bar
Enable the "Menu Bar Price" command to see the current price in your menu bar. It updates every 10 minutes.

## Data Sources

- [Nordpool](https://data.nordpoolgroup.com/auction/day-ahead/prices) - Day-ahead electricity prices
- [Elektrikell](https://elektrikell.ee) - Estonian electricity price reference
- [Elering Dashboard](https://dashboard.elering.ee/et) - Estonian grid operator dashboard