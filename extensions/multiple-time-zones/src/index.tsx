import { List, Action, ActionPanel } from "@raycast/api";
import { useEffect, useState } from "react";
import moment from "moment-timezone";
import { delay, addFavorite, removeFavorite, getFavorite, favorites } from "./utils";

interface Data {
  name: string;
  title: string;
  dateStr: string;
  favorite?: boolean;
}
let timeSpecified = moment().format("YYYY-MM-DD HH:mm:ss");

function TZS(props: { onTZChange: (newValue: string) => void }): JSX.Element {
  const tzs = moment.tz.names();

  const { onTZChange } = props;
  return (
    <List.Dropdown
      tooltip="Select TZ"
      storeValue={true}
      onChange={(newValue) => {
        onTZChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Time Zone List">
        {tzs.map((tz) => (
          <List.Dropdown.Item key={tz} title={tz} value={tz} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

// 是不是时间格式
function isDateTimeString(dateString: string): boolean {
  return moment(dateString, moment.ISO_8601, true).isValid();
}

// 两个时区的转换
function convertDatesBetweenTimezones(date: string, fromZone: string, toZone: string) {
  const from = moment.tz(date, fromZone);
  return from.clone().tz(toZone);
}

// 时区名称
function getTitle(date: string, fromZone: string, toZone: string): string {
  const toZoneDate = convertDatesBetweenTimezones(date, fromZone, toZone).format("YYYY-MM-DD HH:mm:ss");
  return `${toZone}(${moment.tz(toZone).format("ZZ")}): ${toZoneDate}`;
}

// 获取所有时区的转换后的时间
function getAllTimeZones(date: string, fromZone: string): Array<Data> {
  if (!date) {
    date = moment().format("YYYY-MM-DD HH:mm:ss");
  }
  const timeZones = moment.tz.names().map((tz) => {
    let tzFavorite = false;
    if (favorites.includes(tz) === true) {
      tzFavorite = true;
    }
    const title = getTitle(date, fromZone, tz);
    const dateStr = convertDatesBetweenTimezones(date, fromZone, tz).format("YYYY-MM-DD HH:mm:ss");
    return { name: tz, title: title, dateStr: dateStr, favorite: tzFavorite };
  });
  return timeZones;
}

export default function Command() {
  let changeNumber = 0;
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [timeZoneSpecified, setTimeZoneSpecified] = useState<string>("");
  const [allTZ, setAllTZ] = useState<Array<Data>>([]);
  const [isFiltering, setIsFiltering] = useState<boolean>(true);

  // 初始时区是用户当前时区
  if (!timeZoneSpecified) {
    setTimeZoneSpecified(moment.tz.guess());
  }

  useEffect(() => {
    async function syncGetFavorite() {
      await getFavorite();
      // 以当地时间为初始时间，初始化列表
      setIsLoading(true);
      setAllTZ(getAllTimeZones(timeSpecified, timeZoneSpecified));
      setIsLoading(false);
    }

    syncGetFavorite();
  }, []);

  function syncGetAllTimeZones() {
    setIsLoading(true);
    setAllTZ(getAllTimeZones(timeSpecified, timeZoneSpecified));
    setIsLoading(false);
  }

  // 默认时区发生变化时，修改列表的值
  function onTZChange(newValue: string) {
    if (newValue) {
      setTimeZoneSpecified(newValue);
    } else {
      setTimeZoneSpecified(moment.tz.guess());
    }

    setAllTZ(getAllTimeZones(timeSpecified, timeZoneSpecified));
  }

  function getActions(item: Data) {
    const actions = [
      <Action.CopyToClipboard title="Copy Price" content={item.dateStr} onCopy={() => item.dateStr} />,
      <Action
        title={item.favorite ? "Remove From Favorite" : "Add To Favorite"}
        icon={item.favorite ? "remove.png" : "favorite.png"}
        onAction={async () => {
          setAllTZ((allTZ) =>
            allTZ.map((i) => {
              if (i.name === item.name) {
                return { ...i, favorite: !item.favorite };
              }
              return i;
            })
          );
          if (item.favorite) {
            await removeFavorite(item.name);
          } else {
            await addFavorite(item.name);
          }
        }}
      />,
    ];
    return <ActionPanel>{...actions}</ActionPanel>;
  }

  function getList() {
    const listItemList: Array<any> = [];
    const listSectionList: Array<any> = [];
    allTZ.map((item: Data) => {
      if (item.favorite) {
        listSectionList.push(
          <List.Item
            key={item.name}
            title={item.title}
            accessories={item.favorite ? [{ icon: "favorited.png", tooltip: "Favorited" }] : []}
            actions={getActions(item)}
          />
        );
      } else {
        listItemList.push(
          <List.Item
            key={item.name}
            title={item.title}
            accessories={item.favorite ? [{ icon: "favorited.png", tooltip: "Favorited" }] : []}
            actions={getActions(item)}
          />
        );
      }
    });
    return [
      <List.Section title="Favorited">{...listSectionList}</List.Section>,
      <List.Section title="Not Favorited">{...listItemList}</List.Section>,
    ];
  }

  return (
    <List
      isLoading={isLoading}
      filtering={isFiltering}
      searchBarPlaceholder="Get other time zone times for input time."
      searchBarAccessory={<TZS onTZChange={onTZChange} />}
      onSearchTextChange={(searchText) => {
        // 实现延迟搜索
        changeNumber += 1;
        const currentChangeNumber = changeNumber;
        delay(500).then(() => {
          // 过滤非正常搜索 + 延迟搜索
          if (currentChangeNumber !== changeNumber) {
            return;
          } else {
            // 检查输入的是否是日期格式
            if (isDateTimeString(searchText)) {
              setIsFiltering(false);
              timeSpecified = searchText;
              syncGetAllTimeZones();
            } else {
              setIsFiltering(true);
              if (searchText !== "") {
                return allTZ.filter((item) => item.title.toLowerCase().includes(searchText.toLowerCase()));
              }
            }
          }
        });
      }}
    >
      {...getList()}
    </List>
  );
}
