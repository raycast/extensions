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
