# Hebrew Date & Zmanim Extension for Raycast

A comprehensive Raycast extension for Hebrew/Jewish calendar conversions and zmanim (halachic times) calculations, powered by the KosherJava library.

## Features

### 📅 Date Conversions

#### Gregorian → Hebrew
- Convert any Gregorian date to its corresponding Hebrew date
- **"After Sunset" option** - Handle Hebrew day transitions properly (Hebrew days begin at sunset)
- Shows comprehensive information:
  - Hebrew date with full formatting
  - Day of the week
  - Torah portion (parsha) for the week
  - Special days (Rosh Chodesh, Chanukah, Yom Tov, Taanit, Omer count)

#### Hebrew → Gregorian
- Convert Hebrew dates to Gregorian dates with **dropdown interface**
- **No typing errors** - Select month from dropdown (includes Adar II for leap years)
- **Defaults to today's Hebrew date** for quick reference
- Comprehensive month support: Nissan through Elul, including leap year months
- Shows day of week, Torah portion, and special day information

### 🕐 Zmanim (Halachic Times)

#### Comprehensive Zmanim Calculations
- **Complete zmanim list** - All major halachic times including complex calculations
- **Date picker** - Calculate zmanim for any date (defaults to today)
- **Location-based calculations** - Accurate times based on your specific location
- **Searchable interface** - Quickly find specific zmanim (e.g., "alos", "netz", "shkia")
- **Multiple copy options**:
  - Copy just the time (formatted)
  - Copy name + time
  - Copy full datetime
  - Copy all zmanim as JSON

#### Location Setup
- **Address-based geocoding** - Enter "Brooklyn, NY 11225" and get precise coordinates
- **Automatic timezone detection** - No manual timezone configuration needed
- **Persistent location** - Saves your location for future zmanim calculations
- **Search as you type** - Find your location quickly with live search results

## Usage

### Date Conversions

#### Convert Gregorian to Hebrew
1. Open Raycast and type "Gregorian to Hebrew"
2. Select your date using the date picker (defaults to today)
3. Check "After Sunset" if it's currently after sunset (for proper Hebrew day)
4. View comprehensive Hebrew date information including parsha and special days

#### Convert Hebrew to Gregorian
1. Open Raycast and type "Hebrew to Gregorian" 
2. Form will default to today's Hebrew date
3. Adjust day (1-30), select month from dropdown, enter year
4. Get corresponding Gregorian date with full context

### Zmanim Calculations

#### Setup Location (One-time)
1. Open Raycast and type "Setup Location"
2. Search for your address (e.g., "Brooklyn, NY 11213")
3. Select your location from the results
4. Location is saved automatically for future use

#### Get Zmanim
1. Open Raycast and type "Zmanim for Date"
2. Browse all zmanim for today, or use **⌘+D** to change date
3. Search for specific times (e.g., "alos", "shkia", "plag")
4. Copy individual times or export all as JSON

### Keyboard Shortcuts

- **⌘+D**: Change date (in zmanim view)
- **⌘+C**: Copy selected item
- **⌘+⇧+C**: Copy formatted version
- **⌘+←**: Go back

## Installation

1. Install the extension from the Raycast Store
2. Run "Setup Location" to configure your location for zmanim
3. Use any of the date conversion or zmanim commands

## Commands

- **Gregorian to Hebrew** - Convert civil dates to Hebrew calendar
- **Hebrew to Gregorian** - Convert Hebrew dates to civil calendar  
- **Zmanim for Date** - Get all halachic times for any date
- **Setup Location** - Configure your location for accurate zmanim

## Technical Details

### Libraries Used
- **KosherJava (kosher-zmanim)** - Comprehensive Jewish calendar and zmanim calculations
- **OpenStreetMap Nominatim** - Address geocoding for location setup
- **tz-lookup** - Automatic timezone detection from coordinates

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build extension
npm run build
```

## Credits

This extension leverages the powerful **KosherJava** library for accurate Hebrew calendar and zmanim calculations.

### Acknowledgments
- **KosherJava** for providing comprehensive Jewish calendar calculations
- **OpenStreetMap** for free geocoding services
- **Raycast** for creating an excellent platform for productivity extensions

## License

**MIT**