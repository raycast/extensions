import { useFetch } from "@raycast/utils";
import { List } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { MangaList } from "../types";
import { getMangaCalendar } from "../utils/scrapper";
import { monthNames } from "../utils/months";
import MangaListItem from "../components/MangaListItem";
import { DateDropdown } from "../components/DateDropdown";

export default function CurrentMonthPublications() {
  const currentDate = new Date();
  const currentMonth = monthNames[currentDate.getMonth()];
  const currentYear = currentDate.getFullYear();

  const [mangaList, setMangaList] = useState<MangaList>({});
  const [searchText, setSearchText] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");

  const { isLoading, data } = useFetch(`https://miscomics.com.mx/calendario/manga/${currentMonth}-${currentYear}`, {
    keepPreviousData: true,
  });

  useEffect(() => {
    getMangaCalendar(String(data) || "").then((result) => {
      setMangaList(result);
    });
  }, [data]);

  const filteredMangaList = useMemo(() => {
    if (!searchText && !selectedDate) {
      return mangaList;
    }

    const searchTitle = searchText.toLowerCase();
    const searchDate = selectedDate.toLowerCase();
    return Object.entries(mangaList).reduce((filteredMangasByDate, [publicationDate, mangas]) => {
      const filteredMangas = mangas.filter(
        ({ name, publicationDate, editorial }) =>
          (!searchText || (name + editorial).toLowerCase().includes(searchTitle)) &&
          (!selectedDate || publicationDate.toLowerCase().includes(searchDate))
      );
      if (filteredMangas.length > 0) {
        filteredMangasByDate[publicationDate] = filteredMangas;
      }
      return filteredMangasByDate;
    }, {} as MangaList);
  }, [mangaList, selectedDate, searchText]);

  const publicationDates: string[] = useMemo(() => {
    return Object.keys(mangaList);
  }, [mangaList]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarAccessory={<DateDropdown dateList={publicationDates} onDropdownChange={setSelectedDate} />}
    >
      {Object.entries(filteredMangaList).map(([date, mangasByDate], idx) => {
        return (
          mangasByDate && (
            <List.Section
              key={idx}
              title={date}
              subtitle={`Latest releases ${currentMonth.toUpperCase()}-${currentYear}`}
            >
              {mangasByDate.map((manga, idx) => (
                <MangaListItem key={(manga.name + manga.volume, idx)} manga={manga} />
              ))}
            </List.Section>
          )
        );
      })}
    </List>
  );
}
