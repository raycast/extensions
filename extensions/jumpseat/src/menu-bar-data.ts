import { fetchUpcomingFlights } from "./api";
import { projectMenuBarFlight, type MenuBarFlight } from "./menu-bar-flight";

export async function fetchMenuBarFlights(): Promise<MenuBarFlight[]> {
  return (await fetchUpcomingFlights()).map(projectMenuBarFlight);
}
