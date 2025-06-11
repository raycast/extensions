import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import dayjs from "dayjs";
import { useState, useEffect } from "react";
import { getForecast, getPeople } from "../lib/api";

interface Preferences {
  accountId: string;
  token: string;
}

export function useForecast() {
  const { accountId } = getPreferenceValues<Preferences>();
  const [doneIds, setDoneIds] = useCachedState<number[]>("done-assignment-ids", []);
  const [viewDate, setViewDate] = useState(new Date());
  const [filteredPerson, setFilteredPerson] = useCachedState<string>("filtered-person", "");

  const dayjsDate = dayjs(viewDate);
  const dayDescription = dayjsDate.isToday()
    ? "Today"
    : dayjsDate.isYesterday()
      ? "Yesterday"
      : dayjsDate.format("MMMM D");
  const sectionTitle = `${dayDescription}'s Schedule (${dayjsDate.format("dddd")})`;

  const { data: people, isLoading: isLoadingPeople } = useCachedPromise(getPeople, [], {
    initialData: [],
  });

  const {
    data: entries,
    isLoading: isLoadingEntries,
    revalidate,
  } = useCachedPromise(getForecast, [filteredPerson, viewDate, doneIds, people], {
    initialData: [],
    execute: !!people,
  });

  let webUrl = "";
  if (accountId) {
    const baseUrl = `https://forecastapp.com/${accountId}/schedule/team`;
    const params = new URLSearchParams();

    if (filteredPerson === "all") {
      params.append("filter", "dev");
    } else if (filteredPerson) {
      const selectedPerson = people?.find((p) => p.id === filteredPerson);
      if (selectedPerson) {
        params.append("filter", selectedPerson.name.toLowerCase());
      }
    }

    if (!dayjsDate.isToday()) {
      params.append("startDate", dayjsDate.format("YYYY-MM-DD"));
    }

    const queryString = params.toString();
    webUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }

  useEffect(() => {
    if (people && people.length > 0 && !filteredPerson) {
      setFilteredPerson("all");
    }
  }, [people, filteredPerson]);

  useEffect(() => {
    revalidate();
  }, [viewDate, filteredPerson]);

  async function toggleDone(assignmentId: number) {
    if (doneIds.includes(assignmentId)) {
      setDoneIds((prev) => prev.filter((id) => id !== assignmentId));
    } else {
      setDoneIds((prev) => [...prev, assignmentId]);
    }
    revalidate();
  }

  async function changePerson(personId: string) {
    setFilteredPerson(personId);
  }

  async function changeViewDate(date: Date) {
    setViewDate(date);
  }

  return {
    people,
    isLoadingPeople,
    entries,
    isLoadingEntries,
    doneIds,
    toggleDone,
    viewDate,
    changeViewDate,
    filteredPerson,
    changePerson,
    webUrl,
    dayDescription,
    sectionTitle,
    dayjsDate,
  };
}
