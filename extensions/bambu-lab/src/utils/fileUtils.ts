/**
 * Check if a file is a valid printable file (.3mf, .gcode.3mf, or .gcode)
 */
export function isPrintableFile(fileName: string): boolean {
  const name = fileName.toLowerCase();
  return name.endsWith(".3mf") || name.endsWith(".gcode.3mf") || name.endsWith(".gcode");
}

/**
 * Check if a file is a project file (.3mf or .gcode.3mf)
 */
export function isProjectFile(fileName: string): boolean {
  const name = fileName.toLowerCase();
  return name.endsWith(".3mf") || name.endsWith(".gcode.3mf");
}
