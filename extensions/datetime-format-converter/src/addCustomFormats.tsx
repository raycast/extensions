import { List, ActionPanel, Action, Icon, Color, showToast, Toast, LocalStorage } from "@raycast/api";

import { useEffect, useState } from "react";
import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import localizedFormat from "dayjs/plugin/localizedFormat";
import utc from "dayjs/plugin/utc";
dayjs.extend(advancedFormat);
dayjs.extend(localizedFormat);
dayjs.extend(utc);

interface Values {
  format: string;
}

export default function main() {
  const validFormatRegex =
    /\b(YY|YYYY|M|MM|MMM|MMMM|D|DD|Do|d|dd|ddd|dddd|H|HH|h|hh|k|kk|m|mm|s|ss|S|SS|SSS|Z|ZZ|A|a|LT|LTS|L|LL|LLL|LLLL|l|ll|lll|llll|Q|Qo|X|x|w|ww|W|WW|wo|gg|gggg|GG|GGGG|z|zzz)\b/g;

  const [input, setInput] = useState<string>("");
  const [datetimeFormats, setDatetimeFormats] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<boolean>(false);
  const [editKey, setEditKey] = useState<string>("0");

  useEffect(() => {
    const loadFormats = async () => {
      const items = await LocalStorage.allItems<Values>();

      const savedFormatsObject = Object.fromEntries(
        Object.entries(items)
          .sort(([keyA], [keyB]) => Number(keyA) - Number(keyB))
          .map(([key, value]) => [key, String(value)])
      ) as Record<string, string>;

      setDatetimeFormats(savedFormatsObject);
    };
    loadFormats();
  }, []);

  async function addFormatToLocalStorage(key: string, format: string) {
    await LocalStorage.setItem(`${key}`, format);
    console.log(await LocalStorage.allItems());
  }

  async function updateFormatInLocalStorage(key: string, format: string) {
    await LocalStorage.setItem(`${key}`, format);
  }

  async function deleteFormatFromLocalStorage(key: string) {
    console.log(`${key}`);
    if (key === "0") {
      await LocalStorage.clear();
      return;
    }
    await LocalStorage.removeItem(`${key}`);
  }

  function validFormat(format: string) {
    const hasInvalidChars = /[^-A-Za-z\s:/]/.test(format);
    if (hasInvalidChars) {
      return false;
    }

    const matchedTokens = format.match(validFormatRegex);
    const invalidTokens = format.replace(validFormatRegex, "").match(/[A-Za-z]/);

    return Boolean(matchedTokens && !invalidTokens);
  }
  function generateIncrementalUniqueId() {
    // using epoch time due to low throughput
    // and only systemwide uniqueness is required
    return `${Date.now()}`;
  }

  function createNewFormat(): void {
    const inputText = input.trim();
    if (!inputText) {
      showToast({ title: "Cannot add empty format", style: Toast.Style.Failure });
      return;
    } else if (!validFormat(inputText)) {
      showToast({ title: "Date time format is invalid", style: Toast.Style.Failure });
    } else {
      const key = generateIncrementalUniqueId();
      const updatedFormats = { ...datetimeFormats, [key]: inputText };
      setDatetimeFormats(updatedFormats);
      addFormatToLocalStorage(key, inputText);
      setInput("");
      showToast({ title: "New Format Added" });
    }
  }

  function editFormat(): void {
    const inputText = input.trim();
    if (!inputText) {
      showToast({ title: "Cannot add empty format", style: Toast.Style.Failure });
    } else if (!validFormat(inputText)) {
      showToast({ title: "Date time format is invalid", style: Toast.Style.Failure });
    } else {
      setDatetimeFormats((datetimeFormats) => ({
        ...datetimeFormats,
        [editKey]: inputText,
      }));
      updateFormatInLocalStorage(editKey, inputText);
      setInput("");
      showToast({ title: "Updated Format" });
      setEditKey("0");
      setEditing(false);
    }
  }

  function editFormatAction(key: string): void {
    setInput(datetimeFormats[key]);
    setEditing(true);
    setEditKey(key);
  }

  const deleteFormat = (key: string) => {
    console.log(key);
    deleteFormatFromLocalStorage(key);
    setDatetimeFormats((datetimeFormats) => {
      const { [key]: _, ...updatedFormats } = datetimeFormats;
      return updatedFormats;
    });
    setInput("");
    showToast({ title: "Successfully Deleted Format" });
  };

  const deleteAllFormats = () => {
    deleteFormatFromLocalStorage("0");
    setDatetimeFormats({});
    setInput("");
    showToast({ title: "Successfully Deleted All Formats" });
  };

  return (
    <List
      searchText={input}
      onSearchTextChange={setInput}
      filtering={false}
      searchBarPlaceholder="Add new date time format"
      actions={
        <ActionPanel>
          <Action icon={Icon.Plus} onAction={() => createNewFormat()} title="Create New Format" />
        </ActionPanel>
      }
    >
      {datetimeFormats &&
        Object.keys(datetimeFormats).length > 0 &&
        Object.entries(datetimeFormats).map(([key, format]) => (
          <List.Item
            key={key}
            title={format}
            accessories={[{ text: `${dayjs().format(format)}` }]}
            actions={
              editing ? (
                <ActionPanel>
                  <Action icon={Icon.Plus} onAction={() => editFormat()} title="Save updated format" />
                </ActionPanel>
              ) : input.length === 0 ? (
                <ActionPanel>
                  <Action
                    icon={{ source: Icon.Pencil, tintColor: Color.Orange }}
                    onAction={() => editFormatAction(key)}
                    title="Edit Format"
                  />
                  <Action
                    icon={{ source: Icon.Trash, tintColor: Color.Red }}
                    onAction={() => deleteFormat(key)}
                    title="Delete Format"
                  />
                  <Action
                    icon={{ source: Icon.Trash, tintColor: Color.Red }}
                    onAction={() => deleteAllFormats()}
                    title="Delete All Formats"
                  />
                </ActionPanel>
              ) : (
                <ActionPanel>
                  <Action icon={Icon.Plus} onAction={() => createNewFormat()} title="Create New Format" />
                </ActionPanel>
              )
            }
          />
        ))}
    </List>
  );
}
