import { TransportMode } from "./TransportMode";

export type Departure = {
  destination: string;
  direction_code: number;
  direction: number;
  state: "EXPECTED";
  display: string;
  scheduled: string;
  expected: string;
  journey: {
    id: number;
    state: string;
    prediction_state: string;
  };
  stop_area: {
    id: number;
    name: string;
    type: string;
  };
  stop_point: {
    id: number;
    name: string;
    designation: string;
  };
  line: {
    id: number;
    designation: string;
    transport_mode: TransportMode;
    group_of_lines: string;
  };
  deviations: unknown[];
};
