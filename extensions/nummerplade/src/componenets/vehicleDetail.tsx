import { Align, getMarkdownTable } from "markdown-table-ts";
import { Detail } from "@raycast/api";
import { Vehicle } from "../types/vehicleSearch";

export default function VehicleDetail({ vehicle }: { vehicle: Vehicle }) {
  const table = getMarkdownTable({
    table: {
      head: ["Info ℹ️", "Vehicle Details 🚗"],
      body: [
        ["License Plate 🏷️", vehicle.registration ?? "N/A"],
        ["VIN 🔑", vehicle.vin ?? "N/A"],
        ["Status 🟢", vehicle.status ?? "Unknown"],
        ["First registration date 📅", vehicle.first_registration_date ?? "Unknown"],
        ["Kind & Usage 🚙", (vehicle.kind ?? "Unknown") + " " + (vehicle.usage ?? "Unknown")],
        ["Brand & Model 🏎️", (vehicle.brand ?? "Unknown") + " " + (vehicle.model ?? "Unknown")],
        ["Variant 🛠️", vehicle.variant ?? "Unknown"],
        ["Fuel type ⛽", vehicle.fuel_type ?? "Unknown"],
        ["Last recorded mileage 📏", vehicle.mileage?.toString() ?? "Unknown"],
        ["Last inspection date 🔍", vehicle.last_inspection_date ?? "Unknown"],
        ["Last inspection result ✅", vehicle.last_inspection_result ?? "Unknown"],
        ["Next inspection date 📆", vehicle.next_inspection_date_estimate ?? "Unknown"],
        ...vehicle.inspections.map((inspection) => [
          "Previous inspection 🕰️",
          (inspection.date ?? "Unknown") + " - " + (inspection.result ?? "Unknown"),
        ]),
      ],
    },
    alignment: [Align.Left, Align.Right],
  });

  return <Detail markdown={table} />;
}
