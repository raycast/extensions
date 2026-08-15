import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import EntryDetails from "./entry-details-view";
import { formatCountryWithFlag } from "../utils/helpers";

interface Winner {
  year: number;
  countryCode?: string;
  countryName: string;
  song: string;
  artist: string;
  entryId: number;
}

interface CountryWinnersViewProps {
  countryCode?: string;
  countryName: string;
  winners: Winner[];
}

const ORDINALS = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth"];
const getOrdinalLabel = (index: number): string =>
  index < ORDINALS.length ? `${ORDINALS[index]} Win:` : `${index + 1}th win:`;

export default function CountryWinnersView({ countryCode, countryName, winners }: CountryWinnersViewProps) {
  const { push } = useNavigation();
  const sortedWinners = [...winners].sort((a, b) => a.year - b.year);

  return (
    <List navigationTitle={`${formatCountryWithFlag(countryCode, countryName)} Winners`}>
      {sortedWinners.map((winner, index) => (
        <List.Item
          key={`${winner.year}-${winner.entryId}`}
          title={`${getOrdinalLabel(index)} ${winner.year}`}
          subtitle={`${winner.song} - ${winner.artist}`}
          actions={
            <ActionPanel>
              <Action
                title="View Entry Details"
                icon={Icon.Info}
                onAction={() => push(<EntryDetails year={winner.year} entryId={winner.entryId} />)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
