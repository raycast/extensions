import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { IStation } from "../types";
import { ReactNode } from "react";

interface StationProps {
  onSelect: (station: IStation) => ReactNode;
  onToggleFavorite: (station: IStation) => void;
  isFavorite?: boolean;
  station: IStation;
}

export default function Station({ isFavorite, onSelect, onToggleFavorite, station }: StationProps) {
  return (
    <List.Item
      accessories={[
        ...(isFavorite ? [{ icon: { source: Icon.Heart, tintColor: Color.Red }, tooltip: "Favorite station" }] : []),
        { icon: Icon.ArrowRight },
      ]}
      icon={Icon.Geopin}
      actions={
        <ActionPanel>
          <Action.Push title="Select" target={onSelect(station)} icon={Icon.ArrowRight} />
          <Action
            title={isFavorite ? "Remove From Favorites" : "Add to Favorites"}
            icon={{
              source: isFavorite ? Icon.HeartDisabled : Icon.Heart,
              tintColor: Color.Red,
            }}
            shortcut={{ modifiers: isFavorite ? ["cmd", "shift"] : ["cmd"], key: "s" }}
            onAction={() => {
              onToggleFavorite(station);
            }}
          />
        </ActionPanel>
      }
      title={station.name || station.address || "Unknown"}
    />
  );
}
