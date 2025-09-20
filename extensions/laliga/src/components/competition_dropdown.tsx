import { List } from "@raycast/api";

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

const seasons: Record<string, { title: string; value: string }[]> = {};

decades.forEach(({ from, to, competitions }) => {
  if (!to) {
    const date = new Date();
    const currentYear = date.getFullYear();
    const currentMonth = date.getMonth();

    to = currentMonth >= 6 ? currentYear + 1 : currentYear;
  }

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
  selected: string;
  onSelect: React.Dispatch<React.SetStateAction<string>>;
}) {
  return (
    <List.Dropdown tooltip="Filter by Competition" value={props.selected} onChange={props.onSelect}>
      {Object.entries(seasons)
        .reverse()
        .map(([year, competitions]) => {
          return (
            <List.Dropdown.Section key={year} title={year}>
              {competitions.map((competition) => {
                return (
                  <List.Dropdown.Item key={competition.value} value={competition.value} title={competition.title} />
                );
              })}
            </List.Dropdown.Section>
          );
        })}
    </List.Dropdown>
  );
}
