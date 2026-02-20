# Ramadan Companion

Ramadan Companion is a Raycast extension that helps you keep track of Sehri (Fajr) and Iftar (Maghrib) times during the holy month of Ramadan. It uses the AlAdhan Prayer Times API to provide accurate timings based on your location and preferred calculation method.

## Features

- **Ramadan Companion**: See both Sehri and Iftar times for today with a countdown to the next event.
- **Iftar Time**: Quickly check the time for Iftar (Maghrib) and how much time is left.
- **Sehri Time**: Quickly check the time for Sehri (Fajr) and the countdown.
- **Configurable**: Setup your City, Country, and preferred Calculation Method in the extension preferences.
- **Flexible**: Choose between 12-hour and 24-hour time formats, and select your preferred Sehri source (Fajr or Imsak).

## Configuration

When you first open the extension, you will be prompted to configure your location:

1. **City**: Enter your city name (e.g., Lahore, London, New York).
2. **Country**: Enter your country name or code (e.g., Pakistan, PK, United States, US).
3. **Calculation Method**: Select the prayer time calculation method used in your region.
4. **Juristic School**: Choose between Hanafi and Shafi/Maliki/Hanbali for Asr calculation.

## Installation

1. **Install Raycast**: If you haven't already, download and install [Raycast](https://raycast.com/).
2. **Search for Extension**: (Once published) Search for "Ramadan Companion" in the Raycast Store and click "Install".
3. **Manual Installation**:
   - Clone this repository.
   - Run `npm install` to install dependencies.
   - Run `npm run dev` to start the extension in development mode.
   - Open Raycast and you should see the extension available.

## Development

To run the extension locally:

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Build the extension:

   ```bash
   npm run build
   ```

## Data Source

This extension uses the [AlAdhan Prayer Times API](https://aladhan.com/prayer-times-api), which provides accurate prayer timings for locations worldwide.

## License

MIT
