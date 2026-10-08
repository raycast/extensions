import React, { useState } from "react";
import { useCachedState } from "@raycast/utils";
import { getCurrentMonth, getCurrentWeek } from "u/getDate";
import { monthViewMode, weekEnable, weekFormat, enableTime, weekDays } from "u/options";

type ContextType = {
  selectedMonth: number;
  setSelectedMonth: (month: number) => void;
  currentYear: number;
  setCurrentYear: (year: number) => void;
  currentWeek: number;
  setCurrentWeek: (week: number) => void;
  currentDay: number;
  setCurrentDay: (day: number) => void;
  currentMonth: number;
  setCurrentMonth: (month: number) => void;
  thisMonth: number;
  viewMode: string;
  setViewMode: (mode: string) => void;
  weekFormat: string;
  enableWeek: boolean;
  setEnableWeek: (enable: boolean) => void;
  enableTimer: boolean;
  setEnableTimer: (enable: boolean) => void;
  selectedDay: number;
  setSelectedDay: (day: number) => void;
  placeholder: string;
  setPlaceholder: (placeholder: string) => void;
  isDayNames: boolean;
  setDayNames: (enable: boolean) => void;
};

const initialContextValue: ContextType = {
  selectedMonth: getCurrentMonth().monthNumber,
  setSelectedMonth: () => {},
  currentYear: 0,
  setCurrentYear: () => {},
  currentWeek: 0,
  setCurrentWeek: () => {},
  currentDay: 0,
  setCurrentDay: () => {},
  selectedDay: 0,
  setSelectedDay: () => {},
  currentMonth: 0,
  setCurrentMonth: () => {},
  thisMonth: 0,
  viewMode: monthViewMode,
  setViewMode: () => {},
  weekFormat: weekFormat,
  enableWeek: enableTime,
  setEnableWeek: () => {},
  enableTimer: enableTime,
  setEnableTimer: () => {},
  placeholder: "",
  setPlaceholder: () => {},
  isDayNames: weekDays,
  setDayNames: () => {},
};

export const Context = React.createContext<ContextType>(initialContextValue);

const FULL_DATE = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
}).format(new Date());

export function Provider({ children }: { children: React.ReactNode }) {
  const date = new Date();
  const [currentYear, setCurrentYear] = useState(date.getFullYear());
  const [currentWeek, setCurrentWeek] = useState(getCurrentWeek());
  const [currentDay, setCurrentDay] = useState(date.getDate());
  const [selectedDay, setSelectedDay] = useState(date.getDate());
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth().monthNumber);
  const [thisMonth] = useState(date.getMonth() + 1);
  const [viewMode, setViewMode] = useCachedState("view-mode", monthViewMode);
  const [enableWeek, setEnableWeek] = useState(weekEnable);
  const [isDayNames, setDayNames] = useState(weekDays);
  const [enableTimer, setEnableTimer] = useState(enableTime);
  const [selectedMonth, setSelectedMonth] = useCachedState("selected-month", getCurrentMonth().monthNumber);
  const [placeholder, setPlaceholder] = useState(FULL_DATE);

  return (
    <Context.Provider
      value={{
        selectedMonth,
        setSelectedMonth,
        currentYear,
        setCurrentYear,
        currentWeek,
        setCurrentWeek,
        currentDay,
        setCurrentDay,
        selectedDay,
        setSelectedDay,
        currentMonth,
        setCurrentMonth,
        thisMonth,
        viewMode,
        setViewMode,
        weekFormat,
        enableWeek,
        setEnableWeek,
        enableTimer,
        setEnableTimer,
        placeholder,
        setPlaceholder,
        isDayNames,
        setDayNames,
      }}
    >
      {children}
    </Context.Provider>
  );
}
