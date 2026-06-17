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
    municipality: string;
    name: string;
  };
  id: string;
  isFavorite: boolean;
}

export interface PredictionsResponse {
  data: Prediction[];
}

export interface Prediction {
  attributes: {
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
    description: string;
    header: string;
    lifecycle: string;
    timeframe: string;
  };
  id: string;
}

export interface Preferences {
  apiKey?: string;
}

export interface Favorite {
  route: Route;
  directionId: number;
  stop: Stop;
}
