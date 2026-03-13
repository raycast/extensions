//
//  units.ts
//  Supernova.io Raycast Extension
//
//  Created by Jan Toman <Supernova.io>
//

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Imports

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Unit helpers

/** Append unit to the value with unit */
export function appendUnitToValue(value: number, unit: string): string {
  if (!value && value !== 0) {
    return ""
  } else if (!unit || unit === "") {
    return value.toString()
  } else if (unit === "Pixels") {
    return value + "px"
  } else if (unit === "Percent") {
    return value + "%"
  }
  return ""
}
