import { ItemDef, ItemId } from "../../types";

export const ENGINEERING_ITEMS: Partial<Record<ItemId, ItemDef>> = {
  alloy_plate: {
    id: "alloy_plate",
    name: "Alloy Plate",
    description: "Smelted plating, a building block for better gear.",
    value: 18,
  },
  circuit_board: {
    id: "circuit_board",
    name: "Circuit Board",
    description: "Salvaged parts, reflowed into something that works.",
    value: 60,
  },
  servo_unit: {
    id: "servo_unit",
    name: "Servo Unit",
    description: "A small motor with a lot of opinions about torque.",
    value: 253,
  },
  power_core: {
    id: "power_core",
    name: "Power Core",
    description: "A fist of stored lightning in a heavy shell.",
    value: 868,
  },
  fusion_cell: {
    id: "fusion_cell",
    name: "Fusion Cell",
    description: "A star in a jar. Handle like one.",
    value: 2263,
  },
  capacitor: {
    id: "capacitor",
    name: "Capacitor Bank",
    description: "A tidy block of stored lightning.",
    value: 432,
  },
  quantum_processor: {
    id: "quantum_processor",
    name: "Quantum Processor",
    description: "It is thinking about something. It will not say what.",
    value: 2809,
  },
  singularity_core: {
    id: "singularity_core",
    name: "Singularity Core",
    description: "Do not drop it.",
    value: 8967,
  },
  sensor_array: {
    id: "sensor_array",
    name: "Sensor Array",
    description: "A dish, a board and a lot of patience.",
    value: 212,
  },
  gyro_stabiliser: {
    id: "gyro_stabiliser",
    name: "Gyro Stabilizer",
    description: "Three rings that spin until the world agrees with them.",
    value: 812,
  },
  plasma_conduit: {
    id: "plasma_conduit",
    name: "Plasma Conduit",
    description: "Rated for a temperature you should not ask about.",
    value: 4050,
  },
  cable_spool: {
    id: "cable_spool",
    name: "Cable Spool",
    description: "Wire enough to wire a whole base, if you are patient.",
    value: 24,
  },
};
