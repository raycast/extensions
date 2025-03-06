import { List } from "@raycast/api";
import { GroupedRoute } from "../types";
import RouteListItem from "./route-item";

interface ListSectionProps {
  controller: string;
  paths: Record<string, GroupedRoute>;
  port: string;
}

function RouteListSection({ controller, paths, port }: ListSectionProps) {
  return (
    <List.Section key={controller} title={controller} subtitle={`${Object.keys(paths).length} endpoints`}>
      {Object.values(paths).map((groupedRoute) => (
        <RouteListItem key={groupedRoute.path} groupedRoute={groupedRoute} controller={controller} port={port} />
      ))}
    </List.Section>
  );
}

export default RouteListSection;
