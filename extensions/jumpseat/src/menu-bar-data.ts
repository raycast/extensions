import { retainAirlineBrands } from "./airline-brand";
import { fetchUpcomingFlights } from "./api";
import { projectMenuBarFlight, type MenuBarFlight } from "./menu-bar-flight";

export async function fetchMenuBarFlights(
  previous?: readonly MenuBarFlight[],
): Promise<MenuBarFlight[]> {
  return retainAirlineBrands(previous, await fetchUpcomingFlights()).map(
    projectMenuBarFlight,
  );
}
