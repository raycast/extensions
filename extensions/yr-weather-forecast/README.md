# Yr Weather Forecast

A modern, feature-rich [Raycast](https://www.raycast.com) extension for displaying weather forecasts from The Norwegian Institute of Meteorology (MET). Get accurate weather information with an intuitive interface, smart search, and beautiful visualizations.

**Maintainer:** Kynd  
**Contact:** weather@kynd.no  
**Issues & Feedback:** [GitHub Issues](https://github.com/kyndig/yr-weather-raycast/issues)

## ✨ Features

### 🌤️ Weather & Forecasts
- **Accurate Data**: Powered by MET's official weather API
- **Detailed Views**: Hourly forecasts with temperature, wind, precipitation, and weather conditions
- **Visual Graphs**: Beautiful SVG charts showing temperature trends and precipitation
- **Quick Day Access**: Get weather for specific dates with natural language queries

### 🔍 Smart Search & Navigation
- **Location Search**: Find any city or place worldwide using OpenStreetMap
- **Quick Day Queries**: "Oslo fredag", "London next monday", "Bergen 25"
- **Favorites System**: Save your most-used locations for instant access
- **Smart Search**: Intelligent caching and query parsing

### 🎨 UX stuff
- **Welcome System**: Helpful onboarding for new users
- **Keyboard Shortcuts**: Quick actions for power users
- **Units Support**: Metric (default) or Imperial units

### 🚀 Technicalities
- **Fast Performance**: Intelligent caching reduces API calls
- **Error Handling**: Graceful fallbacks and user-friendly error messages
- **Network Testing**: Built-in connectivity diagnostics
- **Debug Mode**: Optional console output for troubleshooting

## 🚀 Getting Started

### Installation
1. Open Raycast and go to Extensions
2. Search for "Yr Weather Forecast"
3. Install the extension
4. Run the `Yr` command to get started

### First Use
1. **Search for a location**: Type a city name (minimum 3 characters)
2. **Quick day search**: Try "Oslo fredag" or "London tomorrow"
3. **Add to favorites**: Use `Cmd+F` to save frequently used locations
4. **Explore views**: Press Enter on favorites to see detailed forecasts
5. **Switch to data view**: Press `D` in any forecast or graph view to see tabular data

## 📱 How to Use

### Main Interface
- **Search Bar**: Type to find locations worldwide
- **Favorites Section**: Your saved locations with current weather
- **Quick Actions**: Add/remove favorites, view forecasts, open graphs

### Search Features
- **Location Search**: Type city names, addresses, or landmarks
- **Date Queries**: 
  - "Oslo fredag" or "oslo friday" for upcoming Friday
  - "London next monday" for next Monday
  - "Bergen 25" for the 25th (if available within the 9 day forecast)
  - "Paris tomorrow" or "Paris i morgen"

### Navigation
- **Enter**: Show current weather (search) or open forecast (favorites)
- **Cmd+F**: Add location to favorites
- **Cmd+Shift+F**: Remove from favorites
- **Cmd+Shift+W**: Show welcome message from any view

## ⌨️ Keyboard Shortcuts

### Global Shortcuts
- **Cmd+Shift+W**: Show welcome message from any view
- **Cmd+Shift+Alt+W**: Hide welcome message

### Search & Favorites
- **Cmd+F**: Add location to favorites
- **Cmd+Shift+F**: Remove location from favorites
- **Enter**: Show current weather (search results) or open forecast (favorites)
- **Cmd+G**: Open graph view directly
- **Cmd+K**: Configure command preferences

### View Navigation
- **D**: Switch to data table view (from Forecast or Graph view)
- **G**: Switch to graph view (from data table view)
- **Space**: Toggle between detailed (48-hour) and summary (9-day) modes in Forecast view

### Detailed Views
- **Forecast View**: Combined hourly data with graphs and data tables
- **One-Day View**: Focused view for specific dates
- **Graph View**: Visual representation of weather trends
- **Data View**: Markdown table of the current location's data

### Data View
The **Data View** provides a comprehensive markdown table showing detailed weather information for the current location. This view is available in both the Forecast View and Graph View.

**Accessing Data View:**
- **From Forecast View**: Press `D` to switch from graph to data table
- **From Graph View**: Press `D` to switch from graph to data table
- **Switch back to Graph**: Press `G` from data view

**Data View Features:**
- Complete weather data in tabular format
- Temperature, wind, precipitation, and weather conditions
- Time-stamped entries for easy reference

## ⚙️ Preferences

Access preferences via `Yr` command → `Cmd+K` → Configure Command:

- **Units**: Metric (°C, m/s, mm) or Imperial (°F, mph, in)
- **Show Wind Direction**: Display wind arrows and cardinal directions
- **Show Sunrise/Sunset**: Include sun times in location displays
- **Debug Mode**: Enable console output for troubleshooting

## 🔧 Debug Mode

Enable debug mode in preferences to see detailed console output for:
- API request failures and responses
- Network connectivity test results
- Weather data fetching errors
- Location search failures

Perfect for troubleshooting connectivity issues or understanding API behavior.

## 📊 Data Sources

- **Weather & Forecast**: [MET Locationforecast 2.0](https://developer.yr.no/doc/locationforecast/2.0/)
- **Sunrise/Sunset**: [MET Sunrise 3.0](https://developer.yr.no/doc/sunrise/3.0/)
- **Geocoding**: [OpenStreetMap Nominatim](https://nominatim.org/)

All APIs are used in compliance with their respective terms of service.

## 🗄️ Caching

- **Forecast Data**: 30 minutes per location
- **Sunrise/Sunset**: 6 hours per location/day
- **Search Results**: Intelligent caching for better performance

## 🔐 Requirements & Privacy

This extension uses publicly available APIs that don't require authentication:
- **MET APIs**: Free weather data from the Norwegian Meteorological Institute
- **OpenStreetMap Nominatim**: Free geocoding service for location search
- **No registration or API keys needed** - just install and use!

### Privacy & Data Usage
- **No Personal Data Collection**: The extension doesn't collect, store, or transmit any personal information
- **Local Storage Only**: All data (favorites, cache) is stored locally on your device
- **No Tracking**: No analytics, tracking, or user behavior monitoring
- **Open Source**: Full source code is available for transparency and security review
- **Data Retention**: Cached weather data is automatically cleared after expiration (30 minutes to 6 hours)
- **Location Privacy**: Search queries are sent to OpenStreetMap for geocoding, but no personal identifiers are included


## 📄 License

MIT License - see package.json for details.

## 🤝 Contributing

We welcome contributions! Please open an issue or submit a pull request on GitHub.

## 📞 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/kyndig/yr-weather-raycast/issues)
- **Email**: weather@kynd.no
- **Documentation**: Check this README and inline code comments

---

**Made with 🫶 by [Kynd](https://www.kynd.no)**  
