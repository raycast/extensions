import { DateDropdown } from "@components/DateDropdown";
import { ListItem } from "@components/ListItem";
import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { GraphicPublication, GraphicPublicationList } from "@types";
import { generateKey } from "@utils/generateKey";
import { monthNames } from "@utils/months";
import { getMangaCalendar } from "@utils/scrapper";
import { useEffect, useMemo, useState } from "react";

export default function CurrentMonthPublications() {
  const currentDate = new Date();
  const currentMonth = monthNames[currentDate.getMonth()];
  const currentYear = currentDate.getFullYear();

  const [publicationsList, setPublicationsList] = useState<GraphicPublicationList>({});
  const [searchText, setSearchText] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");

  const { isLoading, data } = useFetch(`https://miscomics.com.mx/calendario/manga/${currentMonth}-${currentYear}`, {
    keepPreviousData: true,
  });

  useEffect(() => {
    getMangaCalendar(String(data) || "").then((result) => {
      setPublicationsList(result);
    });
  }, [data]);

  const filteredPublicationsList = useMemo(() => {
    if (!searchText && !selectedDate) {
      return publicationsList;
    }

    const searchTitle = searchText.toLowerCase();
    const searchDate = selectedDate.toLowerCase();
    return Object.entries(publicationsList).reduce(
      (
        filteredPublicationsByDate: GraphicPublicationList,
        [publicationDate, publications]: [string, GraphicPublication[]]
      ) => {
        const filteredMangas = publications.filter(
          ({ name, publicationDate, editorial }) =>
            (!searchText || (name + editorial).toLowerCase().includes(searchTitle)) &&
            (!selectedDate || publicationDate.toLowerCase().includes(searchDate))
        );
        if (filteredMangas.length > 0) {
          filteredPublicationsByDate[publicationDate] = filteredMangas;
        }
        return filteredPublicationsByDate;
      },
      {} as GraphicPublicationList
    );
  }, [publicationsList, selectedDate, searchText]);

  const publicationDates: string[] = useMemo(() => {
    return Object.keys(publicationsList);
  }, [publicationsList]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarAccessory={<DateDropdown dateList={publicationDates} onDropdownChange={setSelectedDate} />}
    >
      {Object.entries(filteredPublicationsList).map(([date, mangasByDate]) => {
        return (
          mangasByDate && (
            <List.Section key={generateKey()} title={date.includes("00") ? "No Date" : date}>
              {mangasByDate.map((publication) => (
                <ListItem key={publication.id} publication={publication} isShowingDetail handleAction={() => false} />
              ))}
            </List.Section>
          )
        );
      })}
    </List>
  );
}
