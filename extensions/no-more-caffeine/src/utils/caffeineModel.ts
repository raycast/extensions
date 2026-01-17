import { CaffeineIntake, CaffeineStatus, CaffeineCalculation, Settings } from "../types";

/**
 * Calculate residual caffeine at a given time using exponential decay
 * Formula: R(t) = A × 0.5 ^ ((t - t0) / T1/2)
 *
 * @param intake - The caffeine intake record
 * @param targetTime - The time to calculate residual caffeine for
 * @param halfLifeHours - Caffeine half-life in hours
 * @returns Residual caffeine amount in mg (returns full amount if targetTime is before intake timestamp)
 */
export function calculateResidualCaffeine(intake: CaffeineIntake, targetTime: Date, halfLifeHours: number): number {
  const timeDiffMs = targetTime.getTime() - intake.timestamp.getTime();
  const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

  if (timeDiffHours < 0) {
    return intake.amount;
  }

  const decayFactor = Math.pow(0.5, timeDiffHours / halfLifeHours);
  return intake.amount * decayFactor;
}

/**
 * Calculate total residual caffeine from all intakes at a given time
 * Only considers intakes within the specified time window (default: 48 hours)
 *
 * @param intakes - Array of caffeine intake records
 * @param targetTime - The time to calculate residual caffeine for
 * @param halfLifeHours - Caffeine half-life in hours
 * @param timeWindowHours - Time window in hours to consider intakes (default: 48)
 * @returns Total residual caffeine amount in mg
 */
export function calculateTotalResidualCaffeine(
  intakes: CaffeineIntake[],
  targetTime: Date,
  halfLifeHours: number,
  timeWindowHours: number = 48,
): number {
  const cutoffTime = new Date(targetTime.getTime() - timeWindowHours * 60 * 60 * 1000);

  return intakes
    .filter((intake) => intake.timestamp >= cutoffTime)
    .reduce((total, intake) => {
      return total + calculateResidualCaffeine(intake, targetTime, halfLifeHours);
    }, 0);
}

/**
 * Calculate total caffeine consumed today
 */
export function calculateTodayTotal(intakes: CaffeineIntake[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return intakes.filter((intake) => intake.timestamp >= today).reduce((total, intake) => total + intake.amount, 0);
}

/**
 * Parse bedtime string (HH:mm format) to Date for today
 * If bedtime has already passed today, returns bedtime for tomorrow
 *
 * @param bedtimeStr - Bedtime in HH:mm format (e.g., "22:00")
 * @returns Date object representing the next occurrence of bedtime
 */
export function getBedtimeDate(bedtimeStr: string): Date {
  const [hours, minutes] = bedtimeStr.split(":").map(Number);
  const bedtime = new Date();
  bedtime.setHours(hours, minutes || 0, 0, 0);

  const now = new Date();
  if (bedtime <= now) {
    bedtime.setDate(bedtime.getDate() + 1);
  }

  return bedtime;
}

/**
 * Determine status based on predicted residual and settings
 *
 * Status determination logic:
 * - "no-more-caffeine": Daily max exceeded OR predicted residual > threshold
 * - "warning": Predicted residual is 70-100% of threshold, OR 50%+ if within 2 hours of bedtime
 * - "safe": Below warning thresholds
 *
 * @param predictedResidualAtBedtime - Predicted residual caffeine at bedtime in mg
 * @param maxCaffeineAtBedtime - Maximum allowed residual at bedtime in mg
 * @param todayTotal - Total caffeine consumed today in mg
 * @param dailyMaxCaffeine - Optional daily maximum caffeine limit in mg
 * @param currentTime - Current time (optional, for proximity check)
 * @param bedtime - Bedtime date (optional, for proximity check)
 * @returns Caffeine status: "safe", "warning", or "no-more-caffeine"
 */
export function determineStatus(
  predictedResidualAtBedtime: number,
  maxCaffeineAtBedtime: number,
  todayTotal: number,
  dailyMaxCaffeine?: number,
  currentTime?: Date,
  bedtime?: Date,
): CaffeineStatus {
  if (dailyMaxCaffeine && todayTotal >= dailyMaxCaffeine) {
    return "no-more-caffeine";
  }

  if (predictedResidualAtBedtime > maxCaffeineAtBedtime) {
    return "no-more-caffeine";
  }

  const thresholdPercentage = (predictedResidualAtBedtime / maxCaffeineAtBedtime) * 100;
  if (thresholdPercentage >= 70) {
    return "warning";
  }

  if (currentTime && bedtime) {
    const hoursUntilBedtime = (bedtime.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
    if (hoursUntilBedtime <= 2 && thresholdPercentage >= 50) {
      return "warning";
    }
  }

  return "safe";
}

/**
 * Calculate all caffeine metrics including current residual, predicted bedtime levels, and status
 *
 * @param intakes - Array of caffeine intake records
 * @param settings - User settings (bedtime, half-life, thresholds)
 * @param newDrinkAmount - Optional amount of a new drink to simulate (for prediction before logging)
 * @returns Complete caffeine calculation with current residual, predicted bedtime levels, status, and today's total
 */
export function calculateCaffeineMetrics(
  intakes: CaffeineIntake[],
  settings: Settings,
  newDrinkAmount?: number,
): CaffeineCalculation {
  const now = new Date();
  const bedtime = getBedtimeDate(settings.bedtime);

  const currentResidual = calculateTotalResidualCaffeine(intakes, now, settings.halfLife);

  const predictedResidualAtBedtime = calculateTotalResidualCaffeine(intakes, bedtime, settings.halfLife);

  let predictedResidualAtBedtimeWithNewDrink: number | undefined;
  if (newDrinkAmount !== undefined) {
    const newIntake: CaffeineIntake = {
      id: "temp",
      timestamp: now,
      amount: newDrinkAmount,
      drinkType: "New Drink",
    };
    const intakesWithNew = [...intakes, newIntake];
    predictedResidualAtBedtimeWithNewDrink = calculateTotalResidualCaffeine(intakesWithNew, bedtime, settings.halfLife);
  }

  const todayTotal = calculateTodayTotal(intakes);
  if (newDrinkAmount !== undefined) {
    const todayTotalWithNew = todayTotal + newDrinkAmount;
    const status = determineStatus(
      predictedResidualAtBedtimeWithNewDrink!,
      settings.maxCaffeineAtBedtime,
      todayTotalWithNew,
      settings.dailyMaxCaffeine,
      now,
      bedtime,
    );

    return {
      currentResidual,
      predictedResidualAtBedtime,
      predictedResidualAtBedtimeWithNewDrink,
      status,
      todayTotal: todayTotalWithNew,
    };
  }

  const status = determineStatus(
    predictedResidualAtBedtime,
    settings.maxCaffeineAtBedtime,
    todayTotal,
    settings.dailyMaxCaffeine,
    now,
    bedtime,
  );

  return {
    currentResidual,
    predictedResidualAtBedtime,
    status,
    todayTotal,
  };
}
