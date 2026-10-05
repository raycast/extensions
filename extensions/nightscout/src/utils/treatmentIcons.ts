import { Icon } from "@raycast/api";

/**
 * Maps treatment event types to their corresponding icons
 */
export const treatmentIconMap: Record<string, { source: Icon }> = {
  "Blood Glucose Check": { source: Icon.Raindrop },
  "Snack Bolus": { source: Icon.Mug },
  "Meal Bolus": { source: Icon.MugSteam },
  "Carb Correction": { source: Icon.WrenchScrewdriver },
  "Correction Bolus": { source: Icon.Syringe },
  "Combo Bolus": { source: Icon.Gauge },
  Announcement: { source: Icon.SpeechBubbleImportant },
  Note: { source: Icon.BlankDocument },
  Question: { source: Icon.QuestionMark },
  Exercise: { source: Icon.Weights },
  "Pump Site Change": { source: Icon.Plug },
  "Pump Battery Change": { source: Icon.BatteryCharging },
  "CGM Sensor Insert": { source: Icon.Patch },
  "CGM Sensor Start": { source: Icon.Livestream },
  "CGM Sensor Stop": { source: Icon.LivestreamDisabled },
  "Insulin Cartridge Change": { source: Icon.Replace },
  "Temp Basal Start": { source: Icon.ArrowNe },
  "Temp Basal End": { source: Icon.ArrowRight },
  "Profile Switch": { source: Icon.PersonLines },
  "D.A.D. Alert": { source: Icon.AlarmRinging },
};

/**
 * Gets the icon for a treatment event type, with fallback logic
 */
export function getTreatmentIcon(eventType: string): { source: Icon } {
  // Direct match
  if (treatmentIconMap[eventType]) {
    return treatmentIconMap[eventType];
  }

  // fallback logic for common patterns
  const lowerEventType = eventType.toLowerCase();

  if (lowerEventType.includes("insulin") || lowerEventType.includes("bolus")) {
    return { source: Icon.Syringe };
  }

  if (lowerEventType.includes("carb") || lowerEventType.includes("meal") || lowerEventType.includes("snack")) {
    return { source: Icon.Coins };
  }

  if (lowerEventType.includes("glucose") || lowerEventType.includes("bg")) {
    return { source: Icon.Raindrop };
  }

  if (lowerEventType.includes("exercise") || lowerEventType.includes("activity")) {
    return { source: Icon.Weights };
  }

  if (lowerEventType.includes("note") || lowerEventType.includes("annotation")) {
    return { source: Icon.BlankDocument };
  }

  if (lowerEventType.includes("sensor") || lowerEventType.includes("cgm")) {
    return { source: Icon.MagnifyingGlass };
  }

  if (lowerEventType.includes("pump") || lowerEventType.includes("site") || lowerEventType.includes("battery")) {
    return { source: Icon.Plug };
  }

  // default fallback
  return { source: Icon.Dot };
}
