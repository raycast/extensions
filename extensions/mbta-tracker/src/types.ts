export interface RoutesResponse {
  data: Route[];
}

export interface Route {
  attributes: {
    color: string;
    description: string;
    direction_destinations: string[];
    direction_names: string[];
    long_name: string;
    short_name: string;
    type: string;
  };
  id: string;
}

export interface StopsResponse {
  data: Stop[];
}

export interface Stop {
  attributes: {
    address?: string;
    at_street?: string;
    municipality: string;
    name: string;
    one_street?: string;
  };
  id: string;
}

export interface PredictionsResponse {
  data: Prediction[];
}

export interface Prediction {
  attributes: {
    arrival_time?: string;
    departure_time?: string;
    direction_id: number;
  };
  relationships: {
    alerts: {
      data: AlertRelationship[];
    };
  };
  id: string;
}

export interface AlertRelationship {
  id: string;
  type: "alert";
}

export interface AlertsResponse {
  data: Alert[];
}

export interface Alert {
  attributes: {
    header: string;
  };
  id: string;
}

export interface Preferences {
  apiKey?: string;
}
