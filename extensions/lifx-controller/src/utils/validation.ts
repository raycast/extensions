export function validateBrightness(value: string): { valid: boolean; error?: string; value?: number } {
  const num = parseInt(value);

  if (isNaN(num)) {
    return { valid: false, error: "Brightness must be a number" };
  }

  if (num < 0 || num > 100) {
    return { valid: false, error: "Brightness must be between 0 and 100" };
  }

  return { valid: true, value: num };
}

export function validateHue(value: string): { valid: boolean; error?: string; value?: number } {
  const num = parseInt(value);

  if (isNaN(num)) {
    return { valid: false, error: "Hue must be a number" };
  }

  if (num < 0 || num > 360) {
    return { valid: false, error: "Hue must be between 0 and 360" };
  }

  return { valid: true, value: num };
}

export function validateSaturation(value: string): { valid: boolean; error?: string; value?: number } {
  const num = parseInt(value);

  if (isNaN(num)) {
    return { valid: false, error: "Saturation must be a number" };
  }

  if (num < 0 || num > 100) {
    return { valid: false, error: "Saturation must be between 0 and 100" };
  }

  return { valid: true, value: num };
}

export function validateKelvin(value: string): { valid: boolean; error?: string; value?: number } {
  const num = parseInt(value);

  if (isNaN(num)) {
    return { valid: false, error: "Temperature must be a number" };
  }

  if (num < 2500 || num > 9000) {
    return { valid: false, error: "Temperature must be between 2500K and 9000K" };
  }

  return { valid: true, value: num };
}
