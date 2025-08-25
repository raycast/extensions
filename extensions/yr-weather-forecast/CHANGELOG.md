# Yr Weather Forecast Changelog

## [Unreleased] Version 1.0.0

### New Features
- **Quick day search** with natural language queries like "Oslo fredag", "London next monday", "Bergen 25"
- **One-day view** showing mini graph, hourly table, and natural language weather summary
- **Quick View section** in main UI for immediate day-specific weather access
- **Bilingual date parsing** (English + Norwegian) with support for relative dates and day-of-month
- **Enter key functionality** - pressing Enter on search results now opens detailed forecast view
- **Enhanced error handling** with 150ms delay to prevent message flashing during API calls

### Improvements
- **Error message delays** - "Data fetch failed" and "No forecast available" messages now wait 150ms before showing
- **Better user experience** - no more brief flashes of error messages while API loads
- **Keyboard shortcuts** for favorites management (Cmd+F to add, Cmd+Shift+F to remove)
- **Enhanced success toasts** with location names for favorite actions
- **Consolidated duplicate weather emoji functions** into shared utility
- **Better error handling** for out-of-bounds dates with helpful guidance
- **Improved loading states** - favorites and search results load independently

### Technical Improvements
- **Comprehensive error handling** across all weather components (day-view, forecast, graph)
- **Timeout management** for error and no-data message delays
- **State management** improvements for loading, error, and success states
- **Code organization** with new utility modules for better maintainability

### Core Functionality
- Raycast extension using The Norwegian Institute of Meteorology's open API for weather forecast
- Search locations and manage favorites
- Main view shows temperature, wind, precipitation; optional wind direction and sunrise/sunset
- Detailed forecast with SVG graph (temperature, precipitation, icons, wind arrows)
- Metric/Imperial units and respectful API caching (forecast 30m, sun 6h)