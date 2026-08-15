export interface Route {
  urlHelper: string;
  method: string;
  path: string;
  controller: string;
  action: string;
}

export interface GroupedRoute {
  path: string;
  methods: Route[];
}
