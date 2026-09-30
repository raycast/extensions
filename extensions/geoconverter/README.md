# Coordinate Converter

A Raycast extension for converting coordinates between geodetic (latitude/longitude) and projected coordinate systems.

## Features

- **Convert to Projected**: Transform latitude and longitude coordinates to various projected coordinate systems
- **Convert to Geodetic**: Transform projected coordinates back to latitude and longitude
- **Multiple Coordinate Systems**: Support for popular coordinate systems including:
  - Standard Mercator (EPSG:3395)
  - Web Mercator (EPSG:3857)
  - UTM Zone 33N (EPSG:32633)
  - Lambert Conformal Conic (EPSG:2154)
  - Albers Equal Area (EPSG:3005)
- **Input Validation**: Ensures longitude is between -180° and 180°, latitude between -90° and 90°
- **Copy to Clipboard**: Quickly copy converted coordinates with a single click