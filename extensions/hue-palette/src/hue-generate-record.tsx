import { List } from "@raycast/api";
import { useState, useEffect } from "react";
import { getHueGenerateRecord } from "./utils";
import { HueGenerateRecord } from "./types";
import HueRecordListItem from "./components/hue-record-list-item";

export default function Command() {
  const [hueRecords, setHueRecords] = useState<HueGenerateRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHueGenerateRecord = async () => {
      const hueRecords = await getHueGenerateRecord();
      setHueRecords(hueRecords as HueGenerateRecord[]);
      setIsLoading(false);
    };

    fetchHueGenerateRecord();
  }, []);

  return (
    <List isLoading={isLoading}>
      {hueRecords.length === 0 ? (
        <List.EmptyView
          title="No Hue Generate Record"
          description="Generate Your First Hue Now!"
        />
      ) : (
        <List.Section title="Hue Generate Record">
          {hueRecords
            .sort((a, b) => {
              // First sort by `star` (true first, false second)
              if (a.star !== b.star) {
                return Number(b.star) - Number(a.star);
              }
              // Then sort by `createAt` (most recent first)
              return (
                new Date(b.createAt).getTime() - new Date(a.createAt).getTime()
              );
            })
            .map((record) => (
              <HueRecordListItem
                key={record.hue.name + record.createAt}
                record={record}
                setHueRecords={setHueRecords}
                hueRecords={hueRecords}
              />
            ))}
        </List.Section>
      )}
    </List>
  );
}
