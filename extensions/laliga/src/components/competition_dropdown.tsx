import { Grid, List } from "@raycast/api";

const competitions = [
  {
    title: "LaLiga Santander",
    value: "laliga-santander",
  },
  {
    title: "LaLiga SmartBank",
    value: "laliga-smartbank",
  },
  {
    title: "Women's First Division",
    value: "primera-division-femenina",
  },
];

const seasons = {
  2013: "2013/14",
  2014: "2014/15",
  2015: "2015/16",
  2016: "2016/17",
  2017: "2017/18",
  2018: "2018/19",
  2019: "2019/20",
  2020: "2020/21",
  2021: "2021/22",
  2022: "2022/23",
};

export default function CompetitionDropdown(props: {
  type?: string;
  selected: string;
  onSelect: React.Dispatch<React.SetStateAction<string>>;
}) {
  const DropdownComponent =
    props.type === "grid" ? Grid.Dropdown : List.Dropdown;

  return (
    <DropdownComponent
      tooltip="Filter by Competition"
      value={props.selected}
      onChange={props.onSelect}
    >
      {Object.entries(seasons)
        .sort((a, b) => Number(b[0]) - Number(a[0]))
        .map(([year, season]) => {
          return (
            <DropdownComponent.Section key={year} title={season}>
              {competitions.map((competition) => {
                return (
                  <DropdownComponent.Item
                    key={`${competition.value}-${year}`}
                    value={`${competition.value}-${year}`}
                    title={`${competition.title} ${season}`}
                    // title={competition.title}
                  />
                );
              })}
            </DropdownComponent.Section>
          );
        })}
    </DropdownComponent>
  );
}
