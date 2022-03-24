import { List } from "@raycast/api";

export const seasons = [
  {
    title: "2021/22",
    value: "418",
  },
  {
    title: "2020/21",
    value: "363",
  },
  {
    title: "2019/20",
    value: "274",
  },
  {
    title: "2018/19",
    value: "210",
  },
  {
    title: "2017/18",
    value: "79",
  },
  {
    title: "2016/17",
    value: "54",
  },
  {
    title: "2015/16",
    value: "42",
  },
  {
    title: "2014/15",
    value: "27",
  },
  {
    title: "2013/14",
    value: "22",
  },
  {
    title: "2012/13",
    value: "21",
  },
  {
    title: "2011/12",
    value: "20",
  },
  {
    title: "2010/11",
    value: "19",
  },
  {
    title: "2009/10",
    value: "18",
  },
  {
    title: "2008/09",
    value: "17",
  },
  {
    title: "2007/08",
    value: "16",
  },
  {
    title: "2006/07",
    value: "15",
  },
  {
    title: "2005/06",
    value: "14",
  },
  {
    title: "2004/05",
    value: "13",
  },
  {
    title: "2003/04",
    value: "12",
  },
  {
    title: "2002/03",
    value: "11",
  },
  {
    title: "2001/02",
    value: "10",
  },
  {
    title: "2000/01",
    value: "9",
  },
  {
    title: "1999/00",
    value: "8",
  },
  {
    title: "1998/99",
    value: "7",
  },
  {
    title: "1997/98",
    value: "6",
  },
  {
    title: "1996/97",
    value: "5",
  },
  {
    title: "1995/96",
    value: "4",
  },
  {
    title: "1994/95",
    value: "3",
  },
  {
    title: "1993/94",
    value: "2",
  },
  {
    title: "1992/93",
    value: "1",
  },
];

export default function SeasonDropdown(props: {
  onSelect: React.Dispatch<React.SetStateAction<string>>;
}) {
  return (
    <List.Dropdown tooltip="Filter by Season" onChange={props.onSelect}>
      <List.Dropdown.Section>
        {seasons.map((season) => {
          return (
            <List.Dropdown.Item
              key={season.value}
              value={season.value}
              title={season.title}
            />
          );
        })}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
