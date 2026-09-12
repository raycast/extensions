import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import fetch from 'node-fetch';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import * as unzip from 'unzip-stream';

interface GTFSStop {
  stop_id: string;
  stop_name: string;
  parent_station: string;
}

interface GTFSStopTime {
  trip_id: string;
  stop_id: string;
}

interface GTFSTrip {
  route_id: string;
  trip_id: string;
}

interface GTFSRoute {
  route_id: string;
  route_color: string;
}

interface ProcessedStation {
  id: string;
  name: string;
  lines: string[];
}

const GTFS_URL = 'https://www.transitchicago.com/downloads/sch_data/google_transit.zip';
const OUTPUT_PATH = path.join(__dirname, '../src/generated/trainStations.ts');

async function downloadAndExtractGTFS(): Promise<string> {
  const tempDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  console.log('Downloading GTFS data...');
  const response = await fetch(GTFS_URL);
  if (!response.ok) throw new Error('Failed to download GTFS data');

  console.log('Extracting GTFS data...');
  await pipeline(
    response.body,
    unzip.Extract({ path: tempDir })
  );

  return tempDir;
}

async function parseCSV<T>(filePath: string): Promise<T[]> {
  const results: T[] = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data: T) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

function getLineName(routeId: string): string | null {
  const lineMap: { [key: string]: string } = {
    'Red': 'Red',
    'Blue': 'Blue',
    'Brn': 'Brown',
    'G': 'Green',
    'Org': 'Orange',
    'P': 'Purple',
    'Pink': 'Pink',
    'Y': 'Yellow'
  };
  
  const lineCode = routeId.replace('L-', '');
  return lineMap[lineCode] || null;
}

async function generateStationData() {
  try {
    const tempDir = await downloadAndExtractGTFS();

    console.log('Parsing GTFS files...');
    const stops = await parseCSV<GTFSStop>(path.join(tempDir, 'stops.txt'));
    const stopTimes = await parseCSV<GTFSStopTime>(path.join(tempDir, 'stop_times.txt'));
    const trips = await parseCSV<GTFSTrip>(path.join(tempDir, 'trips.txt'));

    // Process stations
    const stations = new Map<string, ProcessedStation>();
    const stationLines = new Map<string, Set<string>>();

    // Get parent stations
    stops
      .filter(stop => !stop.parent_station) // Only parent stations
      .forEach(station => {
        stations.set(station.stop_id, {
          id: station.stop_id,
          name: station.stop_name.replace(/ Station$/, ''),
          lines: []
        });
      });

    // Map stops to routes
    const stopToTrips = new Map<string, Set<string>>();
    stopTimes.forEach(stopTime => {
      const trips = stopToTrips.get(stopTime.stop_id) || new Set();
      trips.add(stopTime.trip_id);
      stopToTrips.set(stopTime.stop_id, trips);
    });

    // Map trips to lines
    trips.forEach(trip => {
      const lineName = getLineName(trip.route_id);
      if (!lineName) return;

      const stopIds = Array.from(stopToTrips.entries())
        .filter(([_, tripIds]) => tripIds.has(trip.trip_id))
        .map(([stopId]) => stopId);

      stopIds.forEach(stopId => {
        const stop = stops.find(s => s.stop_id === stopId);
        if (!stop) return;

        const parentId = stop.parent_station || stop.stop_id;
        const lines = stationLines.get(parentId) || new Set();
        lines.add(lineName);
        stationLines.set(parentId, lines);
      });
    });

    // Update stations with lines
    stationLines.forEach((lines, stationId) => {
      const station = stations.get(stationId);
      if (station) {
        station.lines = Array.from(lines).sort();
      }
    });

    // Generate TypeScript file
    const stationsArray = Array.from(stations.values())
      .filter(station => station.lines.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name));

    const fileContent = `// Generated file - do not edit manually
export interface TrainStation {
  id: string;
  name: string;
  lines: string[];
}

export const TRAIN_LINES = [
  { name: "Red", color: "#c60c30" },
  { name: "Blue", color: "#00a1de" },
  { name: "Brown", color: "#62361b" },
  { name: "Green", color: "#009b3a" },
  { name: "Orange", color: "#f9461c" },
  { name: "Pink", color: "#e27ea6" },
  { name: "Purple", color: "#522398" },
  { name: "Yellow", color: "#f9e300" },
] as const;

export const trainStations: TrainStation[] = ${JSON.stringify(stationsArray, null, 2)};
`;

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write the file
    fs.writeFileSync(OUTPUT_PATH, fileContent);
    console.log(`Generated station data at ${OUTPUT_PATH}`);

    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });

  } catch (error) {
    console.error('Error generating station data:', error);
    process.exit(1);
  }
}

generateStationData(); 