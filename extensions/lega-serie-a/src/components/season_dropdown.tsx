import { Grid, List } from "@raycast/api";

export const seasons = [
  "2022-23_150052",
  "2021-22_30030",
  "2020-21_150051",
  "2019-20_120066",
  "2018-19_120056",
  "2017-18_120076",
  "2016-17_120167",
  "2015-16_120160",
  "2014-15_120077",
  "2013-14_120161",
  "2012-13_120123",
  "2011-12_120070",
  "2010-11_120093",
  "2009-10_120100",
  "2008-09_120139",
  "2007-08_120146",
  "2006-07_120092",
  "2005-06_120062",
  "2004-05_120116",
  "2003-04_120061",
  "2002-03_120127",
  "2001-02_120136",
  "2000-01_120057",
  "1999-00_120108",
  "1998-99_120098",
  "1997-98_120065",
  "1996-97_120114",
  "1995-96_120074",
  "1994-95_120072",
  "1993-94_120163",
  "1992-93_120091",
  "1991-92_120128",
  "1990-91_120122",
  "1989-90_120084",
  "1988-89_120117",
  "1987-88_120156",
  "1986-87_120089",
];

export default function SeasonDropdown(props: {
  type?: string;
  selected: string;
  onSelect: React.Dispatch<React.SetStateAction<string>>;
}) {
  const DropdownComponent =
    props.type === "grid" ? Grid.Dropdown : List.Dropdown;

  return (
    <DropdownComponent
      tooltip="Filter by Season"
      value={props.selected}
      onChange={props.onSelect}
    >
      {seasons.map((season) => {
        const [title, season_id] = season.split("_");
        return (
          <DropdownComponent.Item
            key={season_id}
            value={`${title}_${season_id}`}
            title={title}
          />
        );
      })}
    </DropdownComponent>
  );
}
