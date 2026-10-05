import { List } from "@raycast/api";
import { formatDate } from "../utils/utils";

type DateDropdownProps = {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
};

export const DateDropdown = ({ selectedDate, setSelectedDate }: DateDropdownProps) => {
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date;
  });

  const getDayTitle = (date: Date, index: number) => {
    if (index === 0) return "Today";
    if (index === 1) return "Yesterday";
    return date.toLocaleDateString(undefined, { weekday: "long" });
  };

  return (
    <List.Dropdown tooltip="Select a date" value={selectedDate} onChange={(newValue) => setSelectedDate(newValue)}>
      {days.map((date, index) => {
        const value = formatDate(date);
        return <List.Dropdown.Item key={value} title={getDayTitle(date, index)} value={value} />;
      })}
    </List.Dropdown>
  );
};
