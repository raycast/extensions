import { Treatment } from "./Treatment.type";

/**
 * Form model for treatment entry
 * Handles type conversions between form inputs and API requirements
 */
export interface TreatmentFormModel {
  eventType?: string;
  // date input handled as Date object rather than ISO string
  eventTime?: Date | null;
  // numeric inputs that forms handle as strings
  glucose?: string;
  carbs?: string;
  insulin?: string;
  enteredinsulin?: string; // original insulin amount for combo bolus calculations
  relative?: string; // extended insulin amount for combo bolus (opposite of immediate)
  duration?: string;
  percent?: string;
  absolute?: string;
  protein?: string;
  fat?: string;
  preBolus?: string;
  splitNow?: string;
  splitExt?: string;

  glucoseType?: string; // will be validated as "Finger" | "Sensor"
  profile?: string;
  units?: string; // will be validated as "mg/dl" | "mmol"
  transmitterId?: string;
  sensorCode?: string;
  notes?: string;
  enteredBy?: string;
}

/**
 * Utility functions to convert between form model and API model
 */
export class TreatmentFormConverter {
  /**
   * Convert form model to API Treatment type
   */
  static toApiModel(formData: TreatmentFormModel): Partial<Treatment> {
    return {
      eventType: formData.eventType || "",
      created_at: formData.eventTime?.toISOString() || new Date().toISOString(),
      eventTime: formData.eventTime?.toISOString() || new Date().toISOString(),

      glucose: formData.glucose ? parseFloat(formData.glucose) : null,
      carbs: formData.carbs ? parseFloat(formData.carbs) : null,
      insulin: formData.insulin ? parseFloat(formData.insulin) : null,
      enteredinsulin: formData.enteredinsulin ? parseFloat(formData.enteredinsulin) : undefined,
      relative: formData.relative ? parseFloat(formData.relative) : undefined,
      duration: formData.duration ? parseFloat(formData.duration) : undefined,
      percent: formData.percent ? parseFloat(formData.percent) : undefined,
      absolute: formData.absolute ? parseFloat(formData.absolute) : undefined,
      protein: formData.protein ? parseFloat(formData.protein) : undefined,
      fat: formData.fat ? parseFloat(formData.fat) : undefined,
      preBolus: formData.preBolus ? parseFloat(formData.preBolus) : undefined,
      splitNow: formData.splitNow ? parseFloat(formData.splitNow) : undefined,
      splitExt: formData.splitExt ? parseFloat(formData.splitExt) : undefined,

      glucoseType:
        formData.glucoseType && ["Finger", "Sensor"].includes(formData.glucoseType)
          ? (formData.glucoseType as "Finger" | "Sensor")
          : undefined,
      profile: formData.profile,
      units:
        formData.units && ["mg/dl", "mmol"].includes(formData.units) ? (formData.units as "mg/dl" | "mmol") : undefined,
      transmitterId: formData.transmitterId,
      sensorCode: formData.sensorCode,
      notes: formData.notes,
      enteredBy: formData.enteredBy,
    };
  }

  /**
   * Convert API Treatment to form model (for editing existing treatments, if I end up doing that)
   */
  static fromApiModel(apiData: Treatment): TreatmentFormModel {
    return {
      eventType: apiData.eventType,
      eventTime: apiData.eventTime
        ? new Date(apiData.eventTime)
        : apiData.created_at
          ? new Date(apiData.created_at)
          : new Date(),

      // convert numbers to strings for form inputs
      glucose: apiData.glucose?.toString() || "",
      carbs: apiData.carbs?.toString() || "",
      insulin: apiData.insulin?.toString() || "",
      enteredinsulin: apiData.enteredinsulin?.toString() || "",
      relative: apiData.relative?.toString() || "",
      duration: apiData.duration?.toString() || "",
      percent: apiData.percent?.toString() || "",
      absolute: apiData.absolute?.toString() || "",
      protein: apiData.protein?.toString() || "",
      fat: apiData.fat?.toString() || "",
      preBolus: apiData.preBolus?.toString() || "",
      splitNow: apiData.splitNow?.toString() || "",
      splitExt: apiData.splitExt?.toString() || "",

      // pass through string values
      glucoseType: apiData.glucoseType,
      profile: apiData.profile,
      units: apiData.units,
      transmitterId: apiData.transmitterId,
      sensorCode: apiData.sensorCode,
      notes: apiData.notes,
      enteredBy: apiData.enteredBy,
    };
  }

  /**
   * Validate numeric form inputs
   */
  static validateNumericField(
    value: string | undefined,
    fieldName: string,
    options?: {
      min?: number;
      max?: number;
      required?: boolean;
    },
  ): string | undefined {
    if (!value || value.trim() === "") {
      return options?.required ? `${fieldName} is required` : undefined;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return `${fieldName} must be a valid number`;
    }

    if (options?.min !== undefined && numValue < options.min) {
      return `${fieldName} must be at least ${options.min}`;
    }

    if (options?.max !== undefined && numValue > options.max) {
      return `${fieldName} cannot exceed ${options.max}`;
    }

    return undefined;
  }

  /**
   * Validate dropdown selections
   */
  static validateDropdownField(
    value: string | undefined,
    fieldName: string,
    allowedValues: string[],
    required?: boolean,
  ): string | undefined {
    if (!value || value.trim() === "") {
      return required ? `${fieldName} is required` : undefined;
    }

    if (!allowedValues.includes(value)) {
      return `${fieldName} must be one of: ${allowedValues.join(", ")}`;
    }

    return undefined;
  }
}
