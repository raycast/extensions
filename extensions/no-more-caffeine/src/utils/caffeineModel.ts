import { CaffeineIntake, CaffeineStatus, CaffeineCalculation, Settings } from "../types";

export const HOUR = 60 * 60 * 1000;
export const MINUTE = 60 * 1000;

const ABSORPTION_RATE = Math.LN2 / 0.25;

// One-compartment model with first-order absorption and elimination.
// See Caffeine Day by Charles Postiaux for the visualization and model reference.
function absorbedFraction(hours: number, halfLife: number): number {
  if (hours <= 0) return 0;

  const eliminationRate = Math.LN2 / halfLife;
  const rateDifference = Math.abs(ABSORPTION_RATE - eliminationRate);
  const exponentialDifference = rateDifference ? -Math.expm1(-rateDifference * hours) / rateDifference : hours;

  return ABSORPTION_RATE * Math.exp(-Math.min(ABSORPTION_RATE, eliminationRate) * hours) * exponentialDifference;
}

export function calculateResidualCaffeine(
  intake: Pick<CaffeineIntake, "amount" | "timestamp">,
  targetTime: Date,
  halfLifeHours: number,
): number {
  return intake.amount * absorbedFraction((+targetTime - +intake.timestamp) / HOUR, halfLifeHours);
}

export function calculateTotalResidualCaffeine(
  intakes: readonly CaffeineIntake[],
  targetTime: Date,
  halfLifeHours: number,
  timeWindowHours = Infinity,
): number {
  const cutoffTime = +targetTime - timeWindowHours * HOUR;
  return intakes.reduce((total, intake) => {
    if (+intake.timestamp < cutoffTime || intake.timestamp > targetTime) return total;
    return total + calculateResidualCaffeine(intake, targetTime, halfLifeHours);
  }, 0);
}

export function calculateTodayTotal(intakes: readonly CaffeineIntake[], referenceDate = new Date()): number {
  const dayStart = new Date(referenceDate);
  dayStart.setHours(0, 0, 0, 0);
  return intakes.reduce((total, intake) => {
    return intake.timestamp >= dayStart && intake.timestamp <= referenceDate ? total + intake.amount : total;
  }, 0);
}

export function hoursToPeak(halfLife: number): number {
  const eliminationRate = Math.LN2 / halfLife;
  if (!Number.isFinite(eliminationRate)) return 0;
  const difference = eliminationRate - ABSORPTION_RATE;
  if (difference === 0) return 1 / ABSORPTION_RATE;
  return Math.log(eliminationRate / ABSORPTION_RATE) / difference;
}

export function calculateLastCupBy({
  amount,
  baseline,
  bedtime,
  halfLife,
  threshold,
}: {
  amount: number;
  baseline: number;
  bedtime: Date;
  halfLife: number;
  threshold: number;
}): Date | undefined {
  const room = threshold - baseline;
  if (room <= 0) return undefined;

  // Use the declining side of the curve. A dose still being absorbed can peak after bedtime.
  let tooLate = hoursToPeak(halfLife);
  let enoughTime = tooLate;
  if (amount * absorbedFraction(tooLate, halfLife) >= room) {
    enoughTime += halfLife;
    const maxDelay = 24 * 100_000_000 + +bedtime / HOUR;
    while (amount * absorbedFraction(enoughTime, halfLife) >= room) {
      if (enoughTime >= maxDelay) return undefined;
      enoughTime = Math.min(enoughTime * 2, maxDelay);
    }

    while ((enoughTime - tooLate) * HOUR > 1000) {
      const midpoint = (tooLate + enoughTime) / 2;
      if (amount * absorbedFraction(midpoint, halfLife) >= room) {
        tooLate = midpoint;
      } else {
        enoughTime = midpoint;
      }
    }
  }

  const cutoff = new Date(Math.floor((+bedtime - enoughTime * HOUR) / MINUTE) * MINUTE);
  return Number.isFinite(+cutoff) ? cutoff : undefined;
}

/**
 * Parse bedtime string (HH:mm format) to Date for today
 * If bedtime has already passed today, returns bedtime for tomorrow (unless allowPastTime is true)
 *
 * @param bedtimeStr - Bedtime in HH:mm format (e.g., "22:00")
 * @param allowPastTime - If true, returns today's bedtime even if it has passed (for past-bedtime judgment)
 * @returns Date object representing the next occurrence of bedtime
 */
export function getBedtimeDate(bedtimeStr: string, allowPastTime = false, referenceDate?: Date): Date {
  const [hours, minutes] = bedtimeStr.split(":").map(Number);
  const nowRef = referenceDate ? new Date(referenceDate) : new Date();
  const bedtime = new Date(nowRef);
  bedtime.setHours(hours, minutes || 0, 0, 0);

  if (!allowPastTime) {
    if (bedtime <= nowRef) {
      bedtime.setDate(bedtime.getDate() + 1);
      bedtime.setHours(hours, minutes || 0, 0, 0);
    }
  }

  return bedtime;
}

/**
 * Hours after bedtime to resume normal caffeine judgment
 * During this period, judgment is based on current residual caffeine amount
 *
 * Rationale:
 * - 2 hours before bedtime is within the margin of error for caffeine metabolism
 * - To provide additional buffer, normal judgment resumes 6 hours after bedtime
 * - Example: If bedtime is 22:00, normal "prediction to next bedtime" judgment resumes after 4:00 AM
 */
const HOURS_AFTER_BEDTIME_TO_RESUME_NORMAL_JUDGMENT = 6;

/**
 * Determine status based on predicted residual and settings
 *
 * Status determination logic:
 * - If past bedtime (within 6 hours): Judge by current residual caffeine
 *   - "no-more-caffeine": Current residual >= threshold
 *   - "warning": Current residual >= 50% of threshold
 *   - "safe": Below warning thresholds
 * - After 6 hours from bedtime: Resume normal judgment (predict next bedtime)
 * - "no-more-caffeine": Daily max exceeded OR predicted residual > threshold
 * - "warning": Predicted residual is 70-100% of threshold, OR 50%+ if within 2 hours of bedtime
 * - "safe": Below warning thresholds
 *
 * @param predictedResidualAtBedtime - Predicted residual caffeine at bedtime in mg
 * @param maxCaffeineAtBedtime - Maximum allowed residual at bedtime in mg
 * @param todayTotal - Total caffeine consumed today in mg
 * @param dailyMaxCaffeine - Optional daily maximum caffeine limit in mg
 * @param currentTime - Current time (optional, for proximity check and past-bedtime judgment)
 * @param bedtime - Bedtime date (optional, for proximity check and past-bedtime judgment)
 * @param currentResidual - Current residual caffeine in mg (optional, for past-bedtime judgment)
 * @returns Caffeine status: "safe", "warning", or "no-more-caffeine"
 */
export function determineStatus(
  predictedResidualAtBedtime: number,
  maxCaffeineAtBedtime: number,
  todayTotal: number,
  dailyMaxCaffeine?: number,
  currentTime?: Date,
  bedtime?: Date,
  currentResidual?: number,
): CaffeineStatus {
  if (currentTime && bedtime && currentTime >= bedtime && currentResidual !== undefined) {
    const resumeNormalJudgmentTime = new Date(
      bedtime.getTime() + HOURS_AFTER_BEDTIME_TO_RESUME_NORMAL_JUDGMENT * 60 * 60 * 1000,
    );

    if (currentTime < resumeNormalJudgmentTime) {
      const warningThreshold = maxCaffeineAtBedtime * 0.5;
      if (currentResidual >= maxCaffeineAtBedtime) {
        return "no-more-caffeine";
      } else if (currentResidual >= warningThreshold) {
        return "warning";
      }
      return "safe";
    }
  }

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
 * @param newDrinkTimestamp - Optional timestamp for the new drink (defaults to now; use for backdated entries)
 * @param now - Optional reference for the current time (defaults to new Date(); override in tests)
 * @returns Complete caffeine calculation with current residual, predicted bedtime levels, status, and today's total
 */
export function calculateCaffeineMetrics(
  intakes: CaffeineIntake[],
  settings: Settings,
  newDrinkAmount?: number,
  newDrinkTimestamp?: Date,
  now?: Date,
): CaffeineCalculation {
  const effectiveNow = now ?? new Date();
  const bedtime = getBedtimeDate(settings.bedtime, false, effectiveNow);

  const currentResidual = calculateTotalResidualCaffeine(intakes, effectiveNow, settings.halfLife);
  const predictedResidualAtBedtime = calculateTotalResidualCaffeine(intakes, bedtime, settings.halfLife);
  const yesterday = new Date(effectiveNow);
  yesterday.setDate(yesterday.getDate() - 1);
  const todayBedtime = getBedtimeDate(settings.bedtime, true, effectiveNow);
  const lastBedtime = todayBedtime <= effectiveNow ? todayBedtime : getBedtimeDate(settings.bedtime, true, yesterday);
  const isAfterBedtime = +effectiveNow - +lastBedtime < HOURS_AFTER_BEDTIME_TO_RESUME_NORMAL_JUDGMENT * HOUR;
  const statusBedtime = isAfterBedtime ? lastBedtime : bedtime;

  const newIntake =
    newDrinkAmount === undefined
      ? undefined
      : { id: "preview", timestamp: newDrinkTimestamp ?? effectiveNow, amount: newDrinkAmount, drinkType: "New Drink" };
  const allIntakes = newIntake ? [...intakes, newIntake] : intakes;
  const todayTotal = calculateTodayTotal(allIntakes, effectiveNow);
  const predictedResidualAtBedtimeWithNewDrink = newIntake
    ? predictedResidualAtBedtime + calculateResidualCaffeine(newIntake, bedtime, settings.halfLife)
    : undefined;
  const currentResidualForStatus = newIntake
    ? currentResidual + calculateResidualCaffeine(newIntake, effectiveNow, settings.halfLife)
    : currentResidual;

  return {
    currentResidual,
    predictedResidualAtBedtime,
    predictedResidualAtBedtimeWithNewDrink,
    status: determineStatus(
      predictedResidualAtBedtimeWithNewDrink ?? predictedResidualAtBedtime,
      settings.maxCaffeineAtBedtime,
      todayTotal,
      settings.dailyMaxCaffeine,
      effectiveNow,
      statusBedtime,
      currentResidualForStatus,
    ),
    todayTotal,
  };
}
