export interface RoutesResponse {
  data: Route[];
}

export interface Route {
  attributes: {
    color: string;
    description: string;
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
    name: string;
    one_street?: string;
  };
  id: string;
}
