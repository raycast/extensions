import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import CardDetail from "./CardDetail";
import type { MtgCard } from "../types";

interface Props {
  card: MtgCard;
  isLoading: boolean;
}

export default function GridCardItem({ card, isLoading }: Props) {
  return (
    <Grid.Item
      key={card.id}
      content={card.faces[0].imageUrl}
      title={card.fullName}
      subtitle={card.metadata.set.name}
      actions={
        !isLoading && (
          <ActionPanel>
            <ActionPanel.Section title="Information">
              <Action.Push title="Card Detail" icon={Icon.Sidebar} target={<CardDetail card={card} />} />
            </ActionPanel.Section>
          </ActionPanel>
        )
      }
    />
  );
}
