import { Grid, List } from "@raycast/api";

const decades = [
  {
    from: 2013,
    to: 2023,
    competitions: [
      {
        title: "LaLiga Santander",
        value: "laliga-santander",
      },
      {
        title: "LaLiga SmartBank",
        value: "laliga-smartbank",
      },
      {
        title: "Liga F",
        value: "primera-division-femenina",
      },
    ],
  },
  {
    from: 2023,
    competitions: [
      {
        title: "LaLiga EA Sports",
        value: "laliga-easports",
      },
      {
        title: "LaLiga HyperMotion",
        value: "laliga-hypermotion",
      },
      {
        title: "Liga F",
        value: "primera-division-femenina",
      },
    ],
  },
];

const seasons: { [key: string]: { title: string; value: string }[] } = {};
decades.forEach(({ from, to, competitions }) => {
  if (!to) to = from + 1;

  for (let year = from; year < to; year++) {
    const endYear = year + 1;
    const season = `${year}/${Number(endYear.toString().substring(2))}`;
    seasons[season] = competitions.map((competition) => ({
      title: `${competition.title} ${season}`,
      value: `${competition.value}-${year}`,
    }));
  }
});

export default function CompetitionDropdown(props: {
  type?: string;
  selected: string;
  onSelect: React.Dispatch<React.SetStateAction<string>>;
}) {
  const DropdownComponent = props.type === "grid" ? Grid.Dropdown : List.Dropdown;

  return (
    <DropdownComponent tooltip="Filter by Competition" value={props.selected} onChange={props.onSelect}>
      {Object.entries(seasons)
        .reverse()
        .map(([year, competitions]) => {
          return (
            <DropdownComponent.Section key={year} title={year}>
              {competitions.map((competition) => {
                return (
                  <DropdownComponent.Item key={competition.value} value={competition.value} title={competition.title} />
                );
              })}
            </DropdownComponent.Section>
          );
        })}
    </DropdownComponent>
  );
}
