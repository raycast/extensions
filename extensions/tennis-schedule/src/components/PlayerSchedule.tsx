import { Color, List } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import * as cheerio from "cheerio";
import { useFetch } from "@raycast/utils";

interface TableRow {
  rank: string;
  player: string;
  age: number;
  country: string;
  events: { tournament: string; seed: string }[];
}

const eventColors = [Color.Yellow, Color.Red, Color.Blue, Color.Purple, Color.Green, Color.Magenta, Color.Orange];

export function PlayerSchedule({ url }: { url: string }) {
  const [tableItems, setTableItems] = useState<TableRow[]>([]);
  const { data: fetchData, isLoading } = useFetch(`https://12ft.io/api/proxy?q=${encodeURIComponent(url)}`, {
    parseResponse: async (response: Response) => await response.text(),
  });

  useEffect(() => {
    if (fetchData) {
      const $ = cheerio.load(fetchData);
      const table = $("table#u868");
      if (table.length > 0) {
        const tbody = table.find("tbody").first();
        if (!tbody || tbody.length === 0) return;
        const rows = tbody.find("tr");
        const items: TableRow[] = [];
        rows.each((_, row) => {
          // Use only the immediate td children.
          const tds = $(row).children("td");
          if (tds.length >= 5) {
            const rank = $(tds[0]).text().trim();
            const player = $(tds[2]).text().trim();
            const ageCell = $(tds[3]);
            const ageText = ageCell.text().trim();
            const ageP = ageCell.attr("p") || "";
            const age = Number.parseFloat(ageText + ageP);
            const country = $(tds[4]).text().trim();
            const events: { tournament: string; seed: string }[] = [];
            for (let i = 5; i < tds.length; i++) {
              const cell = $(tds[i]);
              const cellText = cell.text().trim();
              let isQual = false;
              let tournament = cellText;
              if (cellText.startsWith("Qual.")) {
                isQual = true;
                tournament = cellText.replace(/^Qual\. ?/, "");
              }
              const seedRaw = cell.attr("p") || "";
              const seed = seedRaw.replace(/[()]/g, "").trim();
              if (isQual) {
                tournament = `${tournament} (Q)`;
              }
              if (tournament) {
                events.push({ tournament, seed });
              }
            }
            items.push({ rank, player, age, country, events });
          }
        });
        setTableItems(items);
      }
    }
  }, [fetchData]);

  const [selectedEvent, setSelectedEvent] = useState("All");

  const uniqueEvents = useMemo(() => {
    const eventsSet = new Set<string>();
    tableItems.forEach((item) => {
      item.events.forEach((e) => eventsSet.add(e.tournament.replace(" (Q)", "")));
    });
    return Array.from(eventsSet);
  }, [tableItems]);

  const filteredItems = useMemo(() => {
    if (selectedEvent === "All") return tableItems;
    return tableItems.filter((item) => item.events.some((e) => e.tournament === selectedEvent));
  }, [tableItems, selectedEvent]);

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by event" storeValue={true} onChange={(newValue) => setSelectedEvent(newValue)}>
          <List.Dropdown.Section title="Events">
            <List.Dropdown.Item key="All" title="All" value="All" />
            {uniqueEvents.map((e) => (
              <List.Dropdown.Item key={e} title={e} value={e} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filteredItems.map((item) => (
        <List.Item
          key={item.rank}
          subtitle={`No. ${item.rank}`}
          title={`${item.player}`}
          accessories={[
            { tag: { value: `${item.age}`, color: Color.Green } },
            { tag: { value: `${item.country}`, color: Color.Magenta } },
            ...item.events.map((e, index) => ({
              tag: {
                value: `${e.tournament}${e.seed ? ` (${e.seed})` : ""}`,
                color: eventColors[index % eventColors.length],
              },
            })),
          ].filter(Boolean)}
        />
      ))}
    </List>
  );
}
