import { Group, Shift } from "../../types/shifts";

function getShifts(): Shift[] {
  return [
    { code: "MM", name: "MySQL to MySQLi", description: "Upgrade from MySQL to MySQLi" },
    { code: "PSR4", name: "PSR-4", description: "Upgrade to PSR-4 namespaces" },
    { code: "PU6", name: "PHPUnit 6", description: "Upgrade to PHPUnit 6" },
    { code: "PU8", name: "PHPUnit 8", description: "Upgrade to PHPUnit 8" },
    { code: "PU9", name: "PHPUnit 9", description: "Upgrade to PHPUnit 9" },
    { code: "PU10", name: "PHPUnit 10", description: "Upgrade to PHPUnit 10" },
    { code: "PP", name: "Pest Converter", description: "Convert from PHPUnit to Pest" },
    { code: "CIG", name: "CI Generator", description: "Generate CI Workflows" },
  ];
}

export const phpShiftsGroup: Group = {
  name: "PHP",
  shifts: getShifts(),
};
