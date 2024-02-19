import { ActionPanel, List, Action, Icon, Color, LaunchProps, getPreferenceValues } from "@raycast/api";
import { Moment } from "moment";
import { useEffect, useState } from "react";
import {
  getDate,
  getEntries,
  getMiteEntries,
  getPersonioEnties,
  getTotal,
  TMiteEntry,
  TPersonioEntry,
  TTogleEntrySimplified,
  TTotal,
} from "./togl";

enum SelectTypes {
  all = "All",
  mite = "Mite",
  personio = "Personio",
}

type Preferences = {
  api_token: string;
  workspace_id: string;
};

type CommandProps = {
  date: string;
};

export default function Command(props: LaunchProps<{ arguments: CommandProps }>) {
  const [miteEntries, setMiteEntries] = useState<TMiteEntry[]>([]);
  const [entries, setEntries] = useState<TTogleEntrySimplified[]>([]);
  const [personioEntries, setPersonioEntries] = useState<TPersonioEntry[]>([]);
  const [selected, setSelected] = useState<SelectTypes>(SelectTypes.all);
  const [total, setTotal] = useState<TTotal>({ worktime: "", breaktime: "" });
  const [currentDate, setCurrentDate] = useState<Moment | null>();

  const { date } = props.arguments;
  const { api_token, workspace_id } = getPreferenceValues<Preferences>();

  const getData = async (searchDate: Moment) => {
    const entries = await getEntries({ token: api_token, workspaceId: workspace_id, date: searchDate });
    setEntries(entries);
    const miteEntries = getMiteEntries(entries);
    const personioEntries = getPersonioEnties(entries);
    const totalEntries = getTotal(personioEntries);
    setMiteEntries(miteEntries);
    setPersonioEntries(personioEntries);
    setTotal(totalEntries);
  };

  useEffect(() => {
    const formattedDate = getDate(date);
    setCurrentDate(formattedDate);
    getData(formattedDate);
  }, []);

  const searchForDate = async (searchText: string) => {
    if (searchText.match(/^\d{2}-\d{2}-\d{4}$/) || searchText.match(/^\d{2}-\d{2}$/) || searchText.match(/^\d{2}$/)) {
      const formattedDate = getDate(searchText);
      setCurrentDate(formattedDate);
      getData(formattedDate);
    }
  };

  const handleDropdownChange = (value: SelectTypes) => setSelected(value);

  const isSelected = (value: SelectTypes[keyof SelectTypes]) => selected === SelectTypes.all || selected === value;

  return (
    <List
      searchBarAccessory={
        <List.Dropdown
          tooltip="Dropdown With Sections"
          onChange={(value: string) => handleDropdownChange(value as unknown as SelectTypes)}
        >
          {Object.values(SelectTypes).map((value) => (
            <List.Dropdown.Item value={value} title={value} key={value} />
          ))}
        </List.Dropdown>
      }
      filtering={false}
      navigationTitle="Toggl"
      searchBarPlaceholder={currentDate ? currentDate.format("DD-MM-yyyy") : "Search"}
      onSearchTextChange={searchForDate}
    >
      {entries.length === 0 && (
        <List.EmptyView icon={{ source: "https://placekitten.com/500/500" }} title="Type something to get started" />
      )}
      {isSelected(SelectTypes.mite) && (
        <List.Section
          title={`Mite for ${currentDate?.format("YYYY/MM/DD")}`}
          subtitle={`work time: ${total.worktime} / breaks: ${total.breaktime}`}
        >
          <MiteEntriesList miteEntries={miteEntries} />
        </List.Section>
      )}
      {isSelected(SelectTypes.personio) && (
        <List.Section
          title={`Personio for ${currentDate?.format("YYYY/MM/DD")}`}
          subtitle={`work time: ${total.worktime} / breaks: ${total.breaktime}`}
        >
          <PersonioEntriesList personioEntries={personioEntries} />
        </List.Section>
      )}
    </List>
  );
}

type MiteEntriesListProps = {
  miteEntries: TMiteEntry[];
};

const MiteEntriesList = ({ miteEntries }: MiteEntriesListProps) => {
  return (
    <>
      {miteEntries &&
        miteEntries.map((item) => (
          <List.Item
            icon={{
              source: Icon.Clock,
              tintColor: item.color,
            }}
            title={`${item.description}`}
            subtitle={item.project}
            key={item.id}
            accessories={[
              { text: item.client, icon: Icon.Folder },
              { text: item.durationTime, icon: Icon.Clock },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Description" content={item.description} />
                <Action.CopyToClipboard title="Copy Time" content={item.durationTime} />
                <Action.OpenInBrowser title="Open Mite in Browser" url={`https://parkside.mite.de/#${item.date}`} />
              </ActionPanel>
            }
          />
        ))}
    </>
  );
};

type PersonioEntriesListProps = {
  personioEntries: TPersonioEntry[];
};
const PersonioEntriesList = ({ personioEntries }: PersonioEntriesListProps) => {
  console.log(personioEntries);
  return (
    <>
      {personioEntries.map((item) => (
        <List.Item
          icon={{
            source: item.type === "break" ? Icon.GameController : Icon.Bolt,
            tintColor: item.type === "break" ? Color.Green : Color.Red,
          }}
          title={`${item.start} - ${item.end}`}
          key={item.id}
          keywords={[item.type]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Start" content={item.start} />
              <Action.CopyToClipboard title="Copy End" content={item.end} />
              <Action.OpenInBrowser
                title="Open Personio in Browser"
                url={`https://parkside.personio.de/attendance/employee/2592866/${item.date}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </>
  );
};
