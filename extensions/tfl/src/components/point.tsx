import { List, Icon, ActionPanel, Action, Color } from "@raycast/api";
import { ReactNode } from "react";
import { IStopPoint } from "../types";

interface StopPointProps {
  onSelect: (stopPoint: IStopPoint) => ReactNode;
  onToggleFavorite: (stopPoint: IStopPoint) => void;
  isFavorite?: boolean;
  stopPoint: IStopPoint;
}

export default function Point({ onSelect, onToggleFavorite, isFavorite, stopPoint }: StopPointProps) {
  return (
    <List.Item
      accessories={[
        ...(isFavorite ? [{ icon: { source: Icon.Heart, tintColor: Color.Red }, tooltip: "Favorite stop point" }] : []),
        { icon: Icon.ArrowRight },
      ]}
      icon={Icon.Geopin}
      actions={
        <ActionPanel>
          <Action.Push title="Select" target={onSelect(stopPoint)} icon={Icon.ArrowRight} />
          <Action
            title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            icon={{
              source: isFavorite ? Icon.HeartDisabled : Icon.Heart,
              tintColor: Color.Red,
            }}
            shortcut={{ modifiers: isFavorite ? ["cmd", "shift"] : ["cmd"], key: "s" }}
            onAction={() => onToggleFavorite(stopPoint)}
          />
        </ActionPanel>
      }
      subtitle={stopPoint.name}
      title={stopPoint.commonName}
      keywords={[stopPoint.commonName, stopPoint.naptanId]}
    />
  );
}
