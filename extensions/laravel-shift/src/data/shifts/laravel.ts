import { Group, Shift } from "../../types/shifts";

export interface Version {
  newVersion: string;
  oldVersion: string;
}

export const laravelVersions: Version[] = [
  { newVersion: "5.0", oldVersion: "4.2" },
  { newVersion: "5.1", oldVersion: "5.0" },
  { newVersion: "5.2", oldVersion: "5.1" },
  { newVersion: "5.3", oldVersion: "5.2" },
  { newVersion: "5.4", oldVersion: "5.3" },
  { newVersion: "5.5", oldVersion: "5.4" },
  { newVersion: "5.6", oldVersion: "5.5" },
  { newVersion: "5.7", oldVersion: "5.6" },
  { newVersion: "5.8", oldVersion: "5.7" },
  { newVersion: "6.x", oldVersion: "5.8" },
  { newVersion: "7.x", oldVersion: "6.x" },
  { newVersion: "8.x", oldVersion: "7.x" },
  { newVersion: "9.x", oldVersion: "8.x" },
  { newVersion: "10.x", oldVersion: "9.x" },
  { newVersion: "11.x", oldVersion: "10.x" },
];

function generateLaravelShifts(): Shift[] {
  const laravelShifts: Shift[] = [];

  laravelVersions.forEach((version: Version) => {
    laravelShifts.push({
      code: parseCode(version.newVersion),
      name: version.newVersion,
      description: `From Laravel ${version.oldVersion} to Laravel ${version.newVersion}`,
    });
  });

  return laravelShifts;
}

function parseCode(code: string): string {
  const parsedCode = code.replace(".", "");

  if (parseInt(code) >= 10) {
    return parsedCode.replace("x", "");
  }

  return parsedCode.replace("x", "0");
}

function getShifts(): Shift[] {
  return [
    { code: "PS", name: "Laravel PreShift", description: "Your Laravel upgrade guide" },
    ...generateLaravelShifts(),
    { code: "UC", name: "Upgrade Checker", description: "Lint your Laravel application" },
    { code: "LS", name: "Laravel Slimmer", description: "Slim your Laravel application" },
    { code: "LL", name: "Laravel Linter", description: 'Doing it the "Laravel Way"?' },
    { code: "LF", name: "Laravel Fixer", description: 'Make it the "Laravel Way"' },
    { code: "TG", name: "Tests Generator", description: "Create model factories and tests" },
    { code: "NM", name: "Namespace Models", description: "Move models to app/Models" },
    { code: "VC", name: "Vite Converter", description: "Migrate from Laravel Mix to Vite" },
    { code: "NC", name: "Namespace Consolidator", description: "Consolidate custom namespaces" },
  ];
}

export const laravelShiftsGroup: Group = {
  name: "Laravel",
  shifts: getShifts(),
};
