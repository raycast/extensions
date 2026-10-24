import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useState, useMemo } from "react";
import vehiclesData from "../assets/vehicles.json";

interface VehicleRecord {
  n: string; // Full Name: "2024 Ford F-150"
  bp: string; // Bolt Pattern: "6x135"
  cb: string; // Center Bore: "87.1mm"
  th: string; // Lug Nut / Bolt: "14x1.5"
  s: string; // URL Slug: "ford/f-150/2024"
}

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const filteredVehicles = useMemo(() => {
    const rawQuery = searchText.trim().toLowerCase();
    if (!rawQuery) {
      // Default initial view: showcase recent/popular models
      return (vehiclesData as VehicleRecord[]).slice(0, 40);
    }

    const tokens = rawQuery.split(/\s+/).filter(Boolean);

    const results: VehicleRecord[] = [];
    for (const car of vehiclesData as VehicleRecord[]) {
      const haystack = `${car.n} ${car.bp}`.toLowerCase();
      const allMatch = tokens.every((tok) => haystack.includes(tok));
      if (allMatch) {
        results.push(car);
        if (results.length >= 50) {
          break; // Keep UI fast and responsive
        }
      }
    }
    return results;
  }, [searchText]);

  return (
    <List
      isLoading={false}
      searchBarPlaceholder="Search 12,000+ vehicles or PCD (e.g. Civic 2024, 5x114.3, F-150)..."
      onSearchTextChange={setSearchText}
      throttle
    >
      <List.Section
        title={`Vehicle Fitment Results (${filteredVehicles.length})`}
      >
        {filteredVehicles.map((car, idx) => {
          const detailUrl = `https://boltpatternhq.com/${car.s}/`;
          const patternSlug = car.bp.toLowerCase().replace(/[^a-z0-9]/g, "-");
          const patternUrl = `https://boltpatternhq.com/bolt-pattern/${patternSlug}/`;

          return (
            <List.Item
              key={`${car.s}-${idx}`}
              icon={Icon.Car}
              title={car.n}
              subtitle={car.bp}
              accessories={[
                { text: `CB: ${car.cb}` },
                { text: `Fastener: ${car.th}` },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Vehicle Fitment">
                    <Action.OpenInBrowser
                      title="View Full Fitment on Boltpatternhq"
                      url={detailUrl}
                    />
                    <Action.CopyToClipboard
                      title="Copy Bolt Pattern"
                      content={car.bp}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Complete Fitment Summary"
                      content={`${car.n} | PCD: ${car.bp} | CB: ${car.cb} | Fastener: ${car.th}`}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Explore & Database">
                    <Action.OpenInBrowser
                      title={`Browse All ${car.bp} Compatible Vehicles`}
                      url={patternUrl}
                      icon={Icon.MagnifyingGlass}
                    />
                    <Action.OpenInBrowser
                      title="Download Full Master Fitment Database"
                      url="https://boltpatternhq.com/data/"
                      icon={Icon.Download}
                    />
                    <Action.OpenInBrowser
                      title="Visit Boltpatternhq Home"
                      url="https://boltpatternhq.com"
                      icon={Icon.Globe}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
