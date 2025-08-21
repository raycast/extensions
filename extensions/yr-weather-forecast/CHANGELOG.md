# Yr-new Changelog

## [Unreleased] - Next PR

- **New**: Quick day search with natural language queries like "Oslo fredag", "London next monday", "Bergen 25"
- **New**: One-day view showing mini graph, hourly table, and natural language weather summary
- **New**: Quick View section in main UI for immediate day-specific weather access
- **New**: Bilingual date parsing (English + Norwegian) with support for relative dates and day-of-month
- **New**: Keyboard shortcuts for favorites management (Cmd+F to add, Cmd+Shift+F to remove)
- **Improved**: Enhanced success toasts with location names for favorite actions
- **Improved**: Consolidated duplicate weather emoji functions into shared utility
- **Improved**: Better error handling for out-of-bounds dates with helpful guidance

## [Initial Version] - {PR_MERGE_DATE}

- Raycast extension using The Norwegian Institute of Meteorology's open API for weather forcast. 
- Search locations and manage favorites
- Main view shows temperature, wind, precipitation; optional wind direction and sunrise/sunset
- Detailed forecast with SVG graph (temperature, precipitation, icons, wind arrows)
- Metric/Imperial units and respectful API caching (forecast 30m, sun 6h)