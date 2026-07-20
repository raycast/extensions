import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { GarminConnect } from "garmin-connect";
import { FitWriter } from "@markw65/fit-file-writer";
import fs from "fs/promises";
import path from "path";
import os from "os";

export class GarminAPI {
  private client: GarminConnect;
  private authenticated = false;

  constructor() {
    this.client = new GarminConnect({
      username: "",
      password: "",
    });
  }

  async authenticate(): Promise<void> {
    const prefs = getPreferenceValues<Preferences>();

    if (!prefs.garminUsername || !prefs.garminPassword) {
      throw new Error(
        "Garmin username and password are required. Please configure them in preferences.",
      );
    }

    // Update credentials
    this.client = new GarminConnect({
      username: prefs.garminUsername,
      password: prefs.garminPassword,
    });

    // Try to restore existing session
    const sessionString = await LocalStorage.getItem<string>("garmin_session");
    if (sessionString) {
      try {
        const tokens = JSON.parse(sessionString);

        // Restore session using stored OAuth tokens
        if (tokens.oauth1 && tokens.oauth2) {
          this.client.loadToken(tokens.oauth1, tokens.oauth2);

          // Verify the session is still valid by making a simple API call
          try {
            await this.client.getUserSettings();
            this.authenticated = true;
            return;
          } catch (error) {
            // Session expired, will re-login
            console.error("Stored session expired:", error);
          }
        }
      } catch (error) {
        // Session restore failed, will login with credentials
        console.error("Failed to restore session:", error);
      }
    }

    // Login with credentials
    await this.client.login();
    this.authenticated = true;

    // Save the session for future use
    await this.saveSession();
  }

  private async saveSession(): Promise<void> {
    // Export current tokens
    const tokens = this.client.exportToken();
    await LocalStorage.setItem("garmin_session", JSON.stringify(tokens));
  }

  async uploadFitFile(fitData: Buffer): Promise<boolean> {
    if (!this.authenticated) {
      await this.authenticate();
    }

    try {
      // The uploadActivity method expects a file path (string), not a Buffer
      // We need to write the buffer to a temporary file first
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(
        tempDir,
        `withings-sync-${Date.now()}.fit`,
      );

      await fs.writeFile(tempFilePath, fitData as unknown as Uint8Array);

      try {
        // Upload FIT file to Garmin Connect
        const upload = await this.client.uploadActivity(tempFilePath);

        // Clean up temp file
        await fs.unlink(tempFilePath);

        // Check if upload was successful
        // The upload response structure varies, so we check for any truthy response
        return !!upload;
      } catch (uploadError) {
        // Clean up temp file even if upload fails
        await fs.unlink(tempFilePath).catch(() => {});
        throw uploadError;
      }
    } catch (error) {
      throw new Error(
        `Failed to upload to Garmin: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getWeightDataForDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<DateWeightMap> {
    if (!this.authenticated) {
      await this.authenticate();
    }

    try {
      const weightMap: DateWeightMap = {};
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        try {
          const weightData = await this.client.getDailyWeightData(currentDate);

          if (
            weightData &&
            weightData.dateWeightList &&
            weightData.dateWeightList.length > 0
          ) {
            // Store ALL measurements for this day, not just the latest
            // This helps detect duplicates
            const dateKey = currentDate.toISOString().split("T")[0];
            const measurements = weightData.dateWeightList;

            // Store the most recent measurement for this day
            const latestMeasurement = measurements[measurements.length - 1];

            weightMap[dateKey] = {
              weight: latestMeasurement.weight / 1000, // Convert grams to kg
              timestamp: latestMeasurement.timestampGMT,
              bodyFat: latestMeasurement.bodyFat ?? undefined,
              muscleMass: latestMeasurement.muscleMass ?? undefined,
              // Add count of measurements to detect duplicates
              count: measurements.length,
            };
          }
        } catch (dayError) {
          // No data for this date;
          console.warn(
            `[GARMIN] No data for ${currentDate.toISOString().split("T")[0]}`,
          );
          console.warn(dayError);
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return weightMap;
    } catch (error) {
      throw new Error(
        `Failed to fetch Garmin weight data: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async measurementExistsInGarmin(
    date: Date,
    weight: number,
  ): Promise<boolean> {
    if (!this.authenticated) {
      await this.authenticate();
    }

    try {
      const weightData = await this.client.getDailyWeightData(date);

      if (
        !weightData ||
        !weightData.dateWeightList ||
        weightData.dateWeightList.length === 0
      ) {
        return false;
      }

      const TOLERANCE_KG = 0.1;
      return weightData.dateWeightList.some(
        (measurement: { weight: number }) =>
          Math.abs(measurement.weight / 1000 - weight) < TOLERANCE_KG,
      );
    } catch (error) {
      console.error(`[GARMIN] Error checking measurement:`, error);
      return false;
    }
  }

  async getLastGarminEntryDate(): Promise<Date | null> {
    if (!this.authenticated) {
      await this.authenticate();
    }

    try {
      // Search backwards from today up to 90 days
      const today = new Date();
      const ninetyDaysAgo = new Date(
        today.getTime() - 90 * 24 * 60 * 60 * 1000,
      );

      const currentDate = new Date(today);

      while (currentDate >= ninetyDaysAgo) {
        try {
          const weightData = await this.client.getDailyWeightData(currentDate);

          if (
            weightData &&
            weightData.dateWeightList &&
            weightData.dateWeightList.length > 0
          ) {
            // Found the most recent entry - return the date
            const latestMeasurement =
              weightData.dateWeightList[weightData.dateWeightList.length - 1];
            // Parse the calendarDate (format: YYYY-MM-DD)
            const dateParts = latestMeasurement.calendarDate.split("-");
            return new Date(
              parseInt(dateParts[0]),
              parseInt(dateParts[1]) - 1,
              parseInt(dateParts[2]),
            );
          }
        } catch (dayError) {
          // No data for this day, continue searching backwards
          console.warn(
            `[GARMIN] No data for ${currentDate.toISOString().split("T")[0]}`,
          );
          console.warn(dayError);
        }

        currentDate.setDate(currentDate.getDate() - 1);
      }

      // No entries found in the last 90 days
      return null;
    } catch (error) {
      throw new Error(
        `Failed to get last Garmin entry: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}

// Garmin weight data interfaces
export interface GarminWeightData {
  startDate: string;
  endDate: string;
  dateWeightList: Array<{
    samplePk: number;
    date: number;
    calendarDate: string;
    weight: number;
    bmi: number | null;
    bodyFat: number | null;
    bodyWater: number | null;
    boneMass: number | null;
    muscleMass: number | null;
    sourceType: string;
    timestampGMT: number;
  }>;
  totalAverage: {
    from: number;
    until: number;
    weight: number;
  };
}

export interface DateWeightMap {
  [dateString: string]: {
    weight: number;
    timestamp: number;
    bodyFat?: number;
    muscleMass?: number;
    count?: number;
  };
}

// FIT file creation utilities
export interface FitFileData {
  timestamp: Date;
  weight?: number;
  bodyFat?: number;
  bodyWater?: number;
  boneMass?: number;
  muscleMass?: number;
  systolicBP?: number;
  diastolicBP?: number;
  heartRate?: number;
}

export function createFitFile(data: FitFileData): Buffer {
  const writer = new FitWriter();

  // Convert timestamp to FIT format (seconds since UTC 00:00 Dec 31 1989)
  const fitTimestamp = Math.floor(
    (data.timestamp.getTime() - 631065600000) / 1000,
  );

  // File ID message - required for all FIT files
  writer.writeMessage("file_id", {
    type: "weight",
    manufacturer: "development", // Use development for custom integrations
    time_created: fitTimestamp,
  });

  // Weight scale message - contains weight and body composition data
  if (data.weight || data.bodyFat) {
    const weightMessage: Record<string, number> = {
      timestamp: fitTimestamp,
    };

    if (data.weight) {
      // Weight in kg with 0.01 kg precision
      weightMessage.weight = data.weight;
    }

    if (data.bodyFat) {
      // Body fat percentage with 0.1% precision
      weightMessage.percent_fat = data.bodyFat;
    }

    if (data.bodyWater) {
      weightMessage.percent_hydration = data.bodyWater;
    }

    if (data.boneMass) {
      weightMessage.bone_mass = data.boneMass;
    }

    if (data.muscleMass) {
      weightMessage.muscle_mass = data.muscleMass;
    }

    writer.writeMessage("weight_scale", weightMessage);
  }

  // Blood pressure message - separate from weight scale
  if (data.systolicBP && data.diastolicBP) {
    const bpMessage: Record<string, number> = {
      timestamp: fitTimestamp,
      systolic_pressure: Math.round(data.systolicBP),
      diastolic_pressure: Math.round(data.diastolicBP),
    };

    if (data.heartRate) {
      bpMessage.heart_rate = Math.round(data.heartRate);
    }

    writer.writeMessage("blood_pressure", bpMessage);
  }

  // Finalize and return the FIT file buffer
  const fitData = writer.finish();
  return Buffer.from(fitData.buffer, fitData.byteOffset, fitData.byteLength);
}

export async function clearGarminSession(): Promise<void> {
  await LocalStorage.removeItem("garmin_session");
}
