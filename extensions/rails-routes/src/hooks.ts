import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { parse } from "node-html-parser";
import { Route, GroupedRoute } from "./types";

export function useFetchRoutes(port: string) {
  const { isLoading, data, error } = useFetch(`http://127.0.0.1:${port}/rails/info/routes`, {
    method: "GET",
    parseResponse: async (response) => response.text(),
  });

  const groupedRoutes = useMemo(() => {
    if (!data) return {};

    const root = parse(data);
    const rows = root.querySelectorAll("tbody tr.route_row");
    const routes: Route[] = [];

    rows.forEach((row) => {
      const helperCell = row.querySelector("td[data-route-name]");
      const methodCell = row.querySelector("td:nth-child(2)");
      const pathCell = row.querySelector("td[data-route-path]");
      const controllerCell = row.querySelector("td:nth-child(4)");

      const urlHelper = helperCell?.text.trim().replace(/_path$/, "") || "N/A";
      const method = methodCell?.text.trim() || "N/A";
      const path = pathCell?.getAttribute("data-route-path") || "N/A";
      const controllerAction = controllerCell?.text.trim() || "N/A";

      const [controller, action] = controllerAction.split("#").map((s) => s.trim());

      routes.push({
        urlHelper,
        method,
        path,
        controller: controller || "N/A",
        action: action || "N/A",
      });
    });

    return routes.reduce(
      (acc, route) => {
        if (!acc[route.controller]) {
          acc[route.controller] = {};
        }

        if (!acc[route.controller][route.path]) {
          acc[route.controller][route.path] = {
            path: route.path,
            methods: [],
          };
        }

        acc[route.controller][route.path].methods.push(route);
        return acc;
      },
      {} as Record<string, Record<string, GroupedRoute>>,
    );
  }, [data]);

  return { isLoading, groupedRoutes, error };
}
