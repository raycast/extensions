# PurpleAir

Reads Air Quality Data from a PurpleAir Sensor

## Overview

A [Raycast](https://raycast.com/) extension that lets you get data from a [PurpleAir Sensor](https://www2.purpleair.com).

To use this extension, you must have an PurpleAir API key, a specific sensor ID, and add it during the extension configuration screen.

You can request an API key from PurpleAir by following [these instructions](https://api.purpleair.com). You only need a READ key.

You can find a sensor to monitor by visiting the [PurplAir Map](https://map.purpleair.com) and picking a sensor, looking at the URL and copying the five digit number after _select=_ in the URL. It should be a number like 166601.

## Features

### Multiple Sensors Support
You can now add multiple sensor IDs separated by commas to monitor several locations at once. This is great for tracking air quality in different areas that matter to you.

### Private Sensors Access
Support for private sensors has been added through read keys. The order of read keys must match the order of private sensor IDs in your list.

### Nearest Sensor Discovery
The extension automatically finds and displays the nearest PurpleAir sensor to your current location, helping you get relevant local air quality data without manual configuration. This feature can be disabled in preferences.

### Comprehensive AQI Information
For each sensor, the extension provides:
- Current AQI with color-coded status indicators
- Historical AQI trends (10min, 30min, 1hr, 6hr, 24hr, 1wk averages)
- Temperature and humidity readings
- Indoor/outdoor location type indicator

### Improved Data Handling
The extension has been optimized for better performance with streamlined data processing and enhanced AQI calculation logic that matches PurpleAir's official map.
