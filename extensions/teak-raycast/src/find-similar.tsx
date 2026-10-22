import { Icon, type LaunchProps, List } from "@raycast/api";
import { SimilarCardsView } from "./components/SimilarCardsView";
import { parseCardReference } from "./lib/cardReference";

export default function FindSimilarCommand(
  props: LaunchProps<{ arguments: Arguments.FindSimilar }>,
) {
  const cardId = parseCardReference(props.arguments?.card ?? "");

  if (!cardId) {
    return (
      <List navigationTitle="Find Similar Cards">
        <List.EmptyView
          description="Paste a card ID, or a link copied with Copy Teak Link."
          icon={Icon.Stars}
          title="That isn't a Teak card"
        />
      </List>
    );
  }

  return <SimilarCardsView cardId={cardId} />;
}
