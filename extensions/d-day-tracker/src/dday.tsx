import { List, ActionPanel, Action, Icon, Form, showToast, Toast, useNavigation, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";

/**
 * D-Day item type definition
 */
interface DDayItem {
  id: string;
  title: string;
  targetDate: string;
  createdAt: number;
}

/**
 * D-Day list screen
 */
export default function DDayList() {
  const [ddayItems, setDDayItems] = useState<DDayItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    const loadDDays = async () => {
      try {
        const storedDDays = await LocalStorage.getItem<string>("ddays");
        if (storedDDays) {
          setDDayItems(JSON.parse(storedDDays));
        }
      } catch (error) {
        console.error("Failed to load D-Days:", error);
        await showToast(Toast.Style.Failure, "Failed to load D-Day list");
      } finally {
        setIsLoading(false);
      }
    };

    loadDDays();
  }, []);

  const calculateDaysLeft = (dateString: string) => {
    const target = new Date(dateString);
    const today = new Date();

    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    const difference = target.getTime() - today.getTime();
    return Math.ceil(difference / (1000 * 3600 * 24));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const deleteDDay = async (id: string) => {
    try {
      const updatedItems = ddayItems.filter((item) => item.id !== id);
      setDDayItems(updatedItems);
      await LocalStorage.setItem("ddays", JSON.stringify(updatedItems));
      await showToast(Toast.Style.Success, "D-Day has been deleted");
    } catch (error) {
      console.error("Failed to delete D-Day:", error);
      await showToast(Toast.Style.Failure, "Failed to delete D-Day");
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search D-Day">
      <List.EmptyView
        icon={Icon.Calendar}
        title="No saved D-Days"
        description="Add a new D-Day"
        actions={
          <ActionPanel>
            <Action
              title="Add D-day"
              icon={Icon.Plus}
              onAction={() => push(<DDayForm onSave={setDDayItems} ddayItems={ddayItems} />)}
            />
          </ActionPanel>
        }
      />

      <List.Section title="D-Day List">
        {ddayItems.map((item) => {
          const daysLeft = calculateDaysLeft(item.targetDate);
          return (
            <List.Item
              key={item.id}
              title={item.title}
              subtitle={formatDate(item.targetDate)}
              accessories={[
                {
                  tag: {
                    value: daysLeft >= 0 ? `D-${daysLeft || "Day"}` : `D+${Math.abs(daysLeft)}`,
                    color: daysLeft > 7 ? "green" : daysLeft >= 0 ? "yellow" : "red",
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Edit"
                    icon={Icon.Pencil}
                    onAction={() => push(<DDayForm onSave={setDDayItems} ddayItems={ddayItems} editItem={item} />)}
                  />
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => deleteDDay(item.id)}
                  />
                  <Action
                    title="Add New D-day"
                    icon={Icon.Plus}
                    onAction={() => push(<DDayForm onSave={setDDayItems} ddayItems={ddayItems} />)}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      <List.Section title="Commands">
        <List.Item
          title="Add New D-Day"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action
                title="Add D-day"
                onAction={() => push(<DDayForm onSave={setDDayItems} ddayItems={ddayItems} />)}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

// D-Day 추가/수정 폼
function DDayForm({
  onSave,
  ddayItems,
  editItem,
}: {
  onSave: React.Dispatch<React.SetStateAction<DDayItem[]>>;
  ddayItems: DDayItem[];
  editItem?: DDayItem;
}) {
  const { pop } = useNavigation();
  const [title, setTitle] = useState(editItem?.title || "");
  const [targetDate, setTargetDate] = useState(editItem?.targetDate || new Date().toISOString().split("T")[0]);
  const [dateInputMethod, setDateInputMethod] = useState<"text" | "picker">("picker");
  const [dateText, setDateText] = useState(editItem ? formatDateForDisplay(editItem.targetDate) : "");

  const parseDate = (dateStr: string): Date | null => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return new Date(dateStr);
    }

    const koreanDateRegex = /(\d+)월\s*(\d+)일(?:\s*(\d{4})년)?/;
    const koreanMatch = dateStr.match(koreanDateRegex);
    if (koreanMatch) {
      const month = parseInt(koreanMatch[1]) - 1;
      const day = parseInt(koreanMatch[2]);
      const year = koreanMatch[3] ? parseInt(koreanMatch[3]) : new Date().getFullYear();
      return new Date(year, month, day);
    }

    return null;
  };

  function formatDateForDisplay(dateStr: string): string {
    const date = new Date(dateStr);
    return `${date.getFullYear()} ${date.getMonth() + 1} ${date.getDate()}`;
  }

  const handleDateTextChange = (text: string) => {
    setDateText(text);
    const parsedDate = parseDate(text);
    if (parsedDate && !isNaN(parsedDate.getTime())) {
      setTargetDate(parsedDate.toISOString().split("T")[0]);
    }
  };

  const handleDatePickerChange = (date: Date | null) => {
    if (date) {
      setTargetDate(date.toISOString().split("T")[0]);
      setDateText(formatDateForDisplay(date.toISOString()));
    }
  };

  const saveDDay = async () => {
    try {
      if (!title.trim()) {
        await showToast(Toast.Style.Failure, "Please enter a title");
        return;
      }

      const parsedDate = new Date(targetDate);
      if (isNaN(parsedDate.getTime())) {
        await showToast(Toast.Style.Failure, "Please enter a valid date");
        return;
      }

      let updatedItems: DDayItem[];

      if (editItem) {
        updatedItems = ddayItems.map((item) => (item.id === editItem.id ? { ...item, title, targetDate } : item));
      } else {
        const newItem: DDayItem = {
          id: Date.now().toString(),
          title,
          targetDate,
          createdAt: Date.now(),
        };
        updatedItems = [...ddayItems, newItem];
      }

      await LocalStorage.setItem("ddays", JSON.stringify(updatedItems));
      onSave(updatedItems);
      await showToast(Toast.Style.Success, editItem ? "D-Day has been updated" : "D-Day has been added");
      pop();
    } catch (error) {
      console.error("Failed to save D-Day:", error);
      await showToast(Toast.Style.Failure, "Failed to save D-Day");
    }
  };

  const daysLeft = (() => {
    try {
      const target = new Date(targetDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      target.setHours(0, 0, 0, 0);
      const difference = target.getTime() - today.getTime();
      return Math.ceil(difference / (1000 * 3600 * 24));
    } catch {
      return 0;
    }
  })();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Save" icon={Icon.SaveDocument} onAction={saveDDay} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Event Title" placeholder="Enter event name" value={title} onChange={setTitle} />

      <Form.Dropdown
        id="dateInputMethod"
        title="Date Input Method"
        value={dateInputMethod}
        onChange={(value) => setDateInputMethod(value as "text" | "picker")}
      >
        <Form.Dropdown.Item value="picker" title="Date Picker" icon={Icon.Calendar} />
        <Form.Dropdown.Item value="text" title="Text Input" icon={Icon.Text} />
      </Form.Dropdown>

      {dateInputMethod === "picker" ? (
        <Form.DatePicker
          id="datePicker"
          title="Target Date"
          value={new Date(targetDate)}
          onChange={handleDatePickerChange}
        />
      ) : (
        <Form.TextField
          id="dateText"
          title="Target Date"
          placeholder="e.g. April 20, 2025 or 2025-04-20"
          value={dateText}
          onChange={handleDateTextChange}
          info="Enter in 'April 20', '2025-04-20' format"
        />
      )}

      <Form.Separator />

      <Form.Description
        title="D-Day Calculation Result"
        text={
          isNaN(new Date(targetDate).getTime())
            ? "Please enter a valid date"
            : `${title || "Event"} is ${Math.abs(daysLeft)} days ${daysLeft >= 0 ? "left" : "overdue"} (${daysLeft >= 0 ? `D-${daysLeft || "Day"}` : `D+${Math.abs(daysLeft)}`})`
        }
      />
    </Form>
  );
}
