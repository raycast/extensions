import { useEffect, useState } from "react";
import { ActionPanel, Action, List, Color } from "@raycast/api";
import { PlayerDetails } from "../types";
import { useATPRankings } from "../hooks";

function DriverList() {
    const [selectedRankings, setSelectedRankings] = useState<PlayerDetails[]>([]);
    const [rankings, isLoading] = useATPRankings();

    useEffect(() => {
        setSelectedRankings(rankings);
    }, [rankings]);

    return (
        <List isLoading={isLoading}>
            {selectedRankings ? selectedRankings.map((standing, index) => (
                <List.Item
                    key={standing.id}
                    icon={{
                        source: standing.ranking + ".png",
                        tintColor: Color.PrimaryText,
                    }}
                    title={standing.rowName}
                    subtitle={standing.country?.name}
                    accessories={[{ text: `Points #${standing.points}` }]}
                />
            )) : null}
        </List>
    );
}

export default DriverList;
