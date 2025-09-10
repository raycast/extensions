# ICE Portal API Analysis

> **TLDR**: Documentation of Deutsche Bahn ICE portal APIs available on WIFIonICE network. Two main endpoints provide comprehensive trip information (/tripInfo/trip) and real-time status data (/status) including GPS location, speed, connectivity, and detailed station information with delays.

## Overview

The ICE Portal provides real-time information about Deutsche Bahn ICE trains when connected to the "WIFIonICE" network. The API offers comprehensive trip and status data for passenger information systems.

## API Endpoints

### Base URL
```
https://iceportal.de/api1/rs/
```

## 1. Trip Information API

### Endpoint
```
GET https://iceportal.de/api1/rs/tripInfo/trip
```

### Response Structure

#### Root Object
```typescript
interface TripResponse {
  trip: Trip;
  connection: Connection | null;
  active: null;
}

interface Trip {
  tripDate: string;        // Format: "YYYY-MM-DD"
  trainType: string;       // e.g., "ICE"
  vzn: string | number;    // Train number (e.g., "74")
  actualPosition: number;  // Current position in meters from start
  distanceFromLastStop: number; // Distance from last station in meters
  totalDistance: number;   // Total trip distance in meters
  stopInfo: StopInfo;
  stops: Station[];
}
```

#### Stop Information
```typescript
interface StopInfo {
  scheduledNext: string | number;    // Next scheduled station ID
  actualNext: string | number;      // Next actual station ID
  actualLast: string | number;      // Last visited station ID
  actualLastStarted: string | number; // Last departed station ID
  finalStationName: string;         // Final destination name
  finalStationEvaNr: string | number; // Final station EVA number
}
```

#### Station Details
```typescript
interface Station {
  station: {
    evaNr: string | number;    // EVA station identifier
    name: string;              // Station name
    code: string | null;       // Station code
    geocoordinates: {
      latitude: number;
      longitude: number;
    };
  };
  timetable: {
    scheduledArrivalTime: number | null;   // Unix timestamp in milliseconds
    actualArrivalTime: number | null;      // Unix timestamp in milliseconds
    showActualArrivalTime: boolean | null;
    arrivalDelay: string | null;           // Delay in format "+5" (5 minutes) or empty string
    scheduledDepartureTime: number | null; // Unix timestamp in milliseconds
    actualDepartureTime: number | null;    // Unix timestamp in milliseconds
    showActualDepartureTime: boolean | null;
    departureDelay: string | null;         // Delay in format "+5" (5 minutes) or empty string
  };
  track: {
    scheduled: string | null;  // Scheduled platform/track
    actual: string | null;     // Actual platform/track
  };
  info: {
    status: number;           // Status code (0=future, 1=current, 2=passed)
    passed: boolean;          // Whether station has been passed
    positionStatus: string;   // e.g., "future", "passed"
    distance: number;         // Distance from trip start in meters
    distanceFromStart: number; // Same as distance
  };
  delayReasons: DelayReason[] | null;
}
```

#### Delay Reasons
```typescript
interface DelayReason {
  code: string;    // Reason code
  text: string;    // Human-readable reason (e.g., "Bauarbeiten" - Construction work)
}
```

### Example Data Points
- **Trip Date**: "2025-09-10"
- **Train**: ICE 74 to Kiel Hbf
- **Current Position**: 246,719m of 872,133m total distance
- **Typical Delays**: 5-13 minutes due to construction work
- **Station Count**: ~15 stations from Zürich HB to Kiel Hbf
- **Timestamp Format**: Milliseconds (e.g., 1757518500000 for Hamburg at 17:35)
- **Delay Format**: Simple strings like "+12" for 12 minutes delay

## 2. Status API

### Endpoint
```
GET https://iceportal.de/api1/rs/status
```

### Response Structure
```typescript
interface StatusResponse {
  connection: boolean;           // Connection status
  serviceLevel: string;          // e.g., "AVAILABLE_SERVICE"
  internet: string;              // e.g., "HIGH", "UNSTABLE"
  latitude: number;              // Current GPS latitude
  longitude: number;             // Current GPS longitude
  tileY: number;                // Map tile coordinate
  tileX: number;                // Map tile coordinate  
  series: string;               // Train series identifier
  serverTime: number;           // Unix timestamp
  speed: number;                // Current speed in km/h
  trainType: string;            // e.g., "ICE"
  tzn: string;                  // Train identifier
  wagonClass: string;           // e.g., "SECOND"
  connectivity: {
    currentState: string;       // e.g., "UNSTABLE"
    nextState: string;          // e.g., "WEAK"  
    remainingTimeSeconds: number; // Time until state change
  };
  bapInstalled: boolean;        // Broadband Access Point installed
  gpsStatus: string;           // e.g., "VALID"
}
```

### Example Status Data
- **Current Location**: 49.1317095°N, 8.4826505°E
- **Speed**: 200.0 km/h
- **Internet Quality**: HIGH (currently UNSTABLE)
- **Connectivity**: 10 minutes of stable connection remaining
- **GPS**: Valid location data

## Use Cases for Bahn Info Extension

### Primary Features
1. **Real-time Journey Progress**
   - Show current position vs. total distance
   - Display next station and arrival time
   - Calculate journey completion percentage

2. **Delay Information**
   - Show current delays for upcoming stations
   - Display delay reasons (construction, etc.)
   - Historical delay pattern analysis

3. **Station Details**
   - List all stops with timing information
   - Show platform changes
   - Highlight passed vs. upcoming stations

4. **Live Status**
   - Current speed and GPS location
   - Internet connectivity status
   - Train technical information

### Implementation Considerations

#### Network Dependency
- APIs only accessible when connected to "WIFIonICE" network
- Implement proper error handling for network unavailability
- Consider caching recent data for offline viewing

#### Data Refresh
- Trip information should be refreshed every 30-60 seconds
- Status data can be updated more frequently (10-30 seconds)
- Implement rate limiting to avoid API overload
- Extension auto-refreshes every 30 seconds with manual refresh option

#### Error Handling
```typescript
// Check for WIFIonICE connection
const isOnICETrain = () => {
  // Implementation to detect WiFi network
  return navigator.connection?.ssid === "WIFIonICE";
};

// API call with proper error handling
const getTripInfo = async () => {
  try {
    if (!isOnICETrain()) {
      throw new Error("Not connected to WIFIonICE network");
    }
    
    const response = await fetch("https://iceportal.de/api1/rs/tripInfo/trip");
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch trip info:", error);
    return null;
  }
};
```

## Data Analysis Insights

### API Data Format Discoveries
- **Timestamps**: API returns Unix timestamps in **milliseconds**, not seconds
- **Delay Format**: Returns simple strings like "+12" instead of ISO duration "PT12M"
- **Time Zone**: All timestamps are in German local time (CET/CEST), no conversion needed when in Germany
- **Station Status**: Uses `info.passed` boolean to determine if station has been passed

### Journey Patterns
- Consistent delay patterns due to construction work
- Delays typically accumulate throughout the journey
- Platform changes are relatively rare but important to highlight
- Hamburg arrival example: Scheduled 17:35, actual 17:40 (+5 minutes delay)

### Connectivity Patterns
- Internet quality varies significantly during journey
- Connectivity states change predictably with geographic location
- Connection stability information helps users plan internet usage

### Geographic Coverage
- GPS coordinates allow for precise location mapping
- Station coordinates enable route visualization
- Distance calculations provide accurate ETA predictions

### Implementation Lessons Learned
- **Delay Formatting**: Need to handle both "+12" and "PT12M" formats for robustness
- **Time Display**: Users prefer "17:35 → 17:40 (+5m)" format over separate delay indicators
- **Station Organization**: Split into "Upcoming" and "Passed" categories improves UX
- **Delta Time**: Showing "in 15m" alongside times provides better context
- **Platform Info**: Works better as subtitle than as separate accessory item

## Security and Privacy
- APIs provide real-time location data - handle responsibly
- No authentication required when on WIFIonICE network
- Consider user privacy when displaying location information
- Implement appropriate data retention policies