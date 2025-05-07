import { List, getPreferenceValues } from "@raycast/api";
import { useFetchRoutes } from "./hooks";
import RouteListSection from "./components/route-section";

export default function Command() {
  const preferences = getPreferenceValues<Preferences.ListRoutes>();
  const { isLoading, groupedRoutes, error } = useFetchRoutes(preferences.port);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search routes by path, controller, or action..."
      navigationTitle="Rails Routes"
      filtering={true}
      throttle={true}
    >
      {error ? (
        <List.EmptyView
          title="Error fetching routes"
          description={"Please check your Rails server is running"}
          icon={{ source: "⚠️" }}
        />
      ) : (
        Object.entries(groupedRoutes).map(([controller, paths]) => (
          <RouteListSection key={controller} controller={controller} paths={paths} port={preferences.port} />
        ))
      )}
    </List>
  );
}
