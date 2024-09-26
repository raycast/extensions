import { Action, ActionPanel, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { CalItem, CalSection, Evnt, Keystone, Project, Todo } from "../../interfaces/interfaceItems";
import {
  getDateAndMohth,
  getDateMounthAndNumber,
  getDayDateAndMouth,
  getMounthStringByMonthNumber,
  progbar,
} from "../../tools/generalTools";
import UseOAuth from "../../fetch/useOAuth";
import useFetchCalendar from "../../fetch/useFetchCalendar";
import { QueryToogleTodo } from "../../queriesFunctions/TodosQueries";
import { QueryAddKeystone, QueryChangeDateKeystone } from "../../queriesFunctions/KeystonesQueries";
import { QueryAddEvent, QueryChangeDateEvent } from "../../queriesFunctions/EventsQueries";
import { QueryDeleteItem } from "../../queriesFunctions/GeneralQueries";
import { nameSearchFilter } from "../../tools/filtersTools";
import TimezoneHook from "../../tools/TimezoneHook";
import { ClearRefreshAction } from "../actions/actions";
import EmptyView from "./EmptyView";

const ADDTIMES = { a: "15 minutes", b: "30 minutes", c: "1 hour", d: "2 hours", e: "4 hours" };

const CalendarView = () => {
  //#region NOTION HOOK
  const { notion } = UseOAuth();
  const { isLoading, refresh, clearRefresh, projects, keystones, events } = useFetchCalendar(notion);
  const { tmDate } = TimezoneHook();

  useEffect(() => {
    if (isLoading) showToast({ title: "Loading...", style: Toast.Style.Animated });
    else {
      if (firstLoad) setFirstLoad(false);
      showToast({ title: "Loaded !", style: Toast.Style.Success });
    }
  }, [isLoading]);

  //#endregion

  //#region STATES
  const [dateViews, setDateViews] = useState<string[]>(["today", "week", "month", "year"]);
  const [itemViews, setItemViews] = useState<string[]>(["event", "keystone"]);
  const [addTime, setAddTime] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("Nothing");
  const [search, setSearch] = useState<string>("");
  const [addType, setAddType] = useState<string>("Nothing");
  const [firstLoad, setFirstLoad] = useState<boolean>(true);
  const [showDetail, setShowDetail] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  //#endregion

  //#region ON FUNCTIONS
  const onChangeItemsView = (item: string) => {
    if (itemViews.length === 2) {
      setItemViews([item]);
      return;
    }
    if (!itemViews.includes(item)) {
      const items = [...itemViews];
      items.push(item);
      setItemViews(items);
    } else {
      const items = [...itemViews];
      const index: number = items.indexOf(item);
      items.splice(index, 1);
      setItemViews(items);
    }
  };

  const onChangeDateViews = (item: string) => {
    if (dateViews.length === 4) {
      setDateViews([item]);
      return;
    }
    if (!dateViews.includes(item)) {
      const items = [...dateViews];
      items.push(item);
      setDateViews(items);
    } else {
      const items = [...dateViews];
      const index: number = items.indexOf(item);
      items.splice(index, 1);
      setDateViews(items);
    }
  };

  const onChangeAddType = (type: string) => {
    if (type === addType || type === "Nothing") {
      setAddType("Nothing");
      setSearch("");
      setAddTime(null);
      return;
    }
    if (type === "Event") setAddTime(ADDTIMES.a);
    setAddType(type);
  };

  const onSelectionChanged = (id: string | null) => {
    if (id === "mc") {
      setShowDetail(true), setOpen(false);
    } else if (id?.includes("keystone")) {
      open ? setShowDetail(true) : setShowDetail(false);
    } else if (id?.includes("event")) {
      setShowDetail(false), setOpen(false);
    }
  };
  const onChangeAddTime = (item: string) => {
    setAddTime(item);
  };
  //#endregion

  //#region HANDLE FUNCTIONS
  const handleToogleTodo = async (todo: Todo) => {
    showToast({ title: "Toogling Todo", style: Toast.Style.Animated });
    await QueryToogleTodo(todo, notion);
    refresh(["keystone"]);
  };

  const handleAddItem = (date: Date | null) => {
    switch (addType) {
      case "Keystone":
        handleAddKeystone(date);
        break;
      case "Event":
        handleAddEvent(date);
        break;
      default:
        break;
    }
    setSearch("");
  };
  const handleAddKeystone = async (date: Date | null) => {
    showToast({ title: "Adding Keystone", style: Toast.Style.Animated });
    if (date === null) return;
    const projectID = projects.find((p) => p.name === filter)?.id as string;
    await QueryAddKeystone(search, date.toISOString(), projectID, [], notion);
    refresh(["keystone"]);
  };
  const handleAddEvent = async (date: Date | null) => {
    showToast({ title: "Adding Event", style: Toast.Style.Animated });
    if (date === null) return;
    const projectID = projects.find((p) => p.name === filter)?.id as string;
    const diff = getDiff(addTime);
    const end = new Date(date.getTime() + diff);
    await QueryAddEvent(search, date.toISOString(), end.toISOString(), projectID, notion);
    refresh(["event"]);
  };

  const handleDeleteItem = async (itemID: string, type: string) => {
    if (await confirmAlert({ title: "Are you sure you want to delete this item ?" })) {
      showToast({ title: "Deleting " + type, style: Toast.Style.Animated });
      await QueryDeleteItem(itemID, notion);
      refresh([type]);
    }
  };

  const handleChangeDateItem = async (date: Date | null, item: CalItem, type: string) => {
    switch (type) {
      case "keystone":
        handleChangeDateKeystone(date, item.id);
        break;
      case "event":
        handleChangeDateEvent(date, item);
        break;
      default:
        break;
    }
  };

  const handleChangeDateKeystone = async (date: Date | null, id: string) => {
    showToast({ title: "Changing Keystone Date", style: Toast.Style.Animated });
    if (date === null) return;
    await QueryChangeDateKeystone(id, date.toISOString(), notion);
    refresh(["keystone"]);
  };

  const handleChangeDateEvent = async (date: Date | null, item: CalItem) => {
    showToast({ title: "Changing Event Date", style: Toast.Style.Animated });
    if (date === null) return;
    const start = item.dateInfos.slice(11, 16).split(":");
    const end = item.dateInfos.split("→")[1].split(":");
    const diff = (parseInt(end[0]) - parseInt(start[0])) * 60 + (parseInt(end[1]) - parseInt(start[1]));

    const endDate = new Date(date.getTime() + diff * 60000);

    await QueryChangeDateEvent(item.id, date.toISOString(), endDate.toISOString(), notion);
    refresh(["event"]);
  };
  //#endregion

  //#region CALENDAR AND CALITEMS
  const CalItem = ({ item }: { item: CalItem }) => {
    if (
      item.project.name.toLowerCase().includes(search) ||
      item.dateInfos.toLowerCase().includes(search) ||
      item.name.toLowerCase().includes(search)
    )
      return <>{item.type === "event" ? <CalItemEvent item={item} /> : <CalItemKeystone item={item} />}</>;
  };

  const CalItemEvent = ({ item }: { item: CalItem }) => {
    const eventSub = retrieveDateInfos(item.dateInfos, showDetail);
    const accessories =
      filter !== "Nothing"
        ? []
        : !showDetail
          ? [{ tag: { value: item.project.icon + " " + item.project.name } }]
          : [{ tag: { value: item.project.icon } }];
    return (
      <List.Item
        title={item.name}
        icon={"⌚"}
        id={"event" + item.id}
        subtitle={eventSub}
        accessories={accessories}
        actions={
          <ActionPanel>
            <ChangeDateAction item={item} type={"event"} />
            <DeleteAction item={item} />
          </ActionPanel>
        }
      />
    );
  };

  const CalItemKeystone = ({ item }: { item: CalItem }) => {
    const done = item.todos.filter((t) => t.checkbox).length;
    const projectAccessories =
      filter !== "Nothing"
        ? []
        : !showDetail
          ? [{ tag: { value: item.project.icon + " " + item.project.name } }]
          : [{ tag: { value: item.project.icon } }];
    const itemsAccessories =
      item.todos.length !== 0 && !showDetail ? [{ tag: { value: progbar(done, item.todos.length, true) } }] : [];
    const accessories = [...itemsAccessories, ...projectAccessories];
    const actions = (
      <ActionPanel>
        {item.todos.length !== 0 ? (
          <Action icon={Icon.Eye} title={open ? "Hide Todos" : "Show Todos"} onAction={() => onToogleOpen()} />
        ) : (
          <></>
        )}
        <ChangeDateAction item={item} type={"keystone"} />
        <DeleteAction item={item} />
      </ActionPanel>
    );

    const onToogleOpen = () => {
      setOpen(!open);
    };

    return (
      <List.Item
        title={item.name}
        icon={"📍"}
        id={"keystone" + item.id}
        subtitle={showDetail ? getDateAndMohth(item.startDate) : getDayDateAndMouth(item.startDate)}
        accessories={accessories}
        actions={actions}
        detail={<List.Item.Detail metadata={<CalItemKeystoneMetadata keystone={item} />} />}
      />
    );
  };
  const CalItemKeystoneMetadata = ({ keystone }: { keystone: CalItem }) => {
    const undone = keystone.todos.filter((t) => t.checkbox === true).length;

    return (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.TagList title="Keystone Task">
          <List.Item.Detail.Metadata.TagList.Item text={progbar(undone, keystone.todos.length, false)} />
        </List.Item.Detail.Metadata.TagList>
        {keystone.todos.map((todo) => {
          return (
            <List.Item.Detail.Metadata.TagList title={todo.name} key={todo.id}>
              <List.Item.Detail.Metadata.TagList.Item
                text={todo.checkbox ? "✅" : "🟥"}
                color={todo.checkbox ? Color.Green : Color.Red}
                onAction={() => {
                  handleToogleTodo(todo);
                }}
              />
            </List.Item.Detail.Metadata.TagList>
          );
        })}
      </List.Item.Detail.Metadata>
    );
  };

  const CalendarSection = ({ calendar }: { calendar: CalSection[] }) => {
    return calendar.map((section, i) => {
      if (dateViews.includes(section.type))
        return (
          <List.Section title={section.name} key={i}>
            {section.items.map((item: CalItem, j: number) => {
              if (itemViews.includes(item.type)) return <CalItem key={j} item={item} />;
            })}
          </List.Section>
        );
    });
  };
  //#endregion

  //#region  MY CALENDAR
  const MyCalendar = () => {
    return (
      <List.Item
        title={"My Calendar"}
        id="mc"
        icon={"📅"}
        actions={
          <ActionPanel>
            <AddElementAction />
            <RefreshAction />
            <ClearRefreshAction clearRefresh={clearRefresh} setFirst={setFirstLoad} setShow={setShowDetail} />
          </ActionPanel>
        }
        detail={<List.Item.Detail metadata={<MyCalendarMetadata />} />}
      />
    );
  };
  const MyCalendarMetadata = () => {
    return (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title={"Your calendar"} />

        <List.Item.Detail.Metadata.TagList title="🗓️ Date filter">
          <List.Item.Detail.Metadata.TagList.Item
            text="Today"
            color={dateViews.includes("today") ? Color.PrimaryText : Color.SecondaryText}
            onAction={() => onChangeDateViews("today")}
          />
          <List.Item.Detail.Metadata.TagList.Item
            text="This week"
            color={dateViews.includes("week") ? Color.PrimaryText : Color.SecondaryText}
            onAction={() => onChangeDateViews("week")}
          />
          <List.Item.Detail.Metadata.TagList.Item
            text="This mounth"
            color={dateViews.includes("month") ? Color.PrimaryText : Color.SecondaryText}
            onAction={() => onChangeDateViews("month")}
          />
          <List.Item.Detail.Metadata.TagList.Item
            text="All year"
            color={dateViews.includes("year") ? Color.PrimaryText : Color.SecondaryText}
            onAction={() => onChangeDateViews("year")}
          />
        </List.Item.Detail.Metadata.TagList>

        <List.Item.Detail.Metadata.TagList title="👁️ Item Filter">
          <List.Item.Detail.Metadata.TagList.Item
            text="📍 Keystones"
            color={itemViews.includes("keystone") ? Color.PrimaryText : Color.SecondaryText}
            onAction={() => onChangeItemsView("keystone")}
          />
          <List.Item.Detail.Metadata.TagList.Item
            text="🤝 Events"
            color={itemViews.includes("event") ? Color.PrimaryText : Color.SecondaryText}
            onAction={() => onChangeItemsView("event")}
          />
        </List.Item.Detail.Metadata.TagList>
        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label
          title="🆕 Add New"
          text={
            filter === "Nothing"
              ? "Select a project filter"
              : addType === "Nothing"
                ? "Select a type"
                : "Enter " + addType + " Name on Search"
          }
        />
        <List.Item.Detail.Metadata.TagList title="">
          {filter === "Nothing" ? (
            <List.Item.Detail.Metadata.TagList.Item text="Select a project filter" color={Color.SecondaryText} />
          ) : (
            <>
              <List.Item.Detail.Metadata.TagList.Item
                text="📍 Keystones"
                onAction={() => onChangeAddType("Keystone")}
                color={addType === "Keystone" ? Color.PrimaryText : Color.SecondaryText}
              />
              <List.Item.Detail.Metadata.TagList.Item
                text="🤝 Events"
                onAction={() => onChangeAddType("Event")}
                color={addType === "Event" ? Color.PrimaryText : Color.SecondaryText}
              />
              {addType !== "Nothing" ? (
                <List.Item.Detail.Metadata.TagList.Item
                  text="Cancel"
                  onAction={() => onChangeAddType("Nothing")}
                  color={Color.Red}
                />
              ) : (
                <></>
              )}
            </>
          )}
        </List.Item.Detail.Metadata.TagList>

        {addType === "Event" ? (
          <List.Item.Detail.Metadata.TagList title="⌛ How many time">
            <List.Item.Detail.Metadata.TagList.Item
              text="15 minutes"
              color={addTime === ADDTIMES.a ? Color.PrimaryText : Color.SecondaryText}
              onAction={() => onChangeAddTime(ADDTIMES.a)}
            />
            <List.Item.Detail.Metadata.TagList.Item
              text="30 minutes"
              color={addTime === ADDTIMES.b ? Color.PrimaryText : Color.SecondaryText}
              onAction={() => onChangeAddTime(ADDTIMES.b)}
            />
            <List.Item.Detail.Metadata.TagList.Item
              text="1 hour"
              color={addTime === ADDTIMES.c ? Color.PrimaryText : Color.SecondaryText}
              onAction={() => onChangeAddTime(ADDTIMES.c)}
            />
            <List.Item.Detail.Metadata.TagList.Item
              text="2 hours"
              color={addTime === ADDTIMES.d ? Color.PrimaryText : Color.SecondaryText}
              onAction={() => onChangeAddTime(ADDTIMES.d)}
            />
            <List.Item.Detail.Metadata.TagList.Item
              text="4 hours"
              color={addTime === ADDTIMES.e ? Color.PrimaryText : Color.SecondaryText}
              onAction={() => onChangeAddTime(ADDTIMES.e)}
            />
          </List.Item.Detail.Metadata.TagList>
        ) : (
          <></>
        )}

        {/* <List.Item.Detail.Metadata.Separator />    
      <List.Item.Detail.Metadata.Label title='🆕 Add New' />
      <List.Item.Detail.Metadata.TagList title='' >
        <List.Item.Detail.Metadata.TagList.Item text='Keystones' onAction={()=> push(<KeystoneForm setChange={setChangeAll} project='Nothing'/>)} />
        <List.Item.Detail.Metadata.TagList.Item text='Events' onAction={()=> push(<EventForm setChange={setChangeAll} />)}/>
      </List.Item.Detail.Metadata.TagList> */}
      </List.Item.Detail.Metadata>
    );
  };
  //#endregion

  //#region SEARCHBAR ACCESSORIES
  const SearchBarAccessories = () => {
    return (
      <List.Dropdown tooltip="Search todos" onChange={setFilter} value={filter}>
        <List.Dropdown.Item title="Nothing" value="Nothing" />
        <List.Dropdown.Section title="Projects">
          {projects.map((project: Project, i: number) => {
            return <List.Dropdown.Item key={i} value={project.name} title={project.name} icon={project.icon} />;
          })}
        </List.Dropdown.Section>
      </List.Dropdown>
    );
  };
  //#endregion

  //#region ACTIONS

  const AddElementAction = () => {
    if (addType === "Nothing") return <></>;
    if (search === "") return <Action style={Action.Style.Destructive} title="Enter Name Into SearchBar" />;
    else return <Action.PickDate title={"Add New " + addType} onChange={(e) => handleAddItem(e)} />;
  };

  const RefreshAction = () => {
    return (
      <Action
        title="Refresh"
        onAction={() => refresh(["all"])}
        icon={Icon.ArrowCounterClockwise}
        autoFocus={false}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
    );
  };
  const DeleteAction = ({ item }: { item: CalItem }) => {
    return (
      <Action
        title="Delete"
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["cmd"], key: "x" }}
        onAction={() => handleDeleteItem(item.id, item.type)}
        icon={Icon.Trash}
      />
    );
  };
  const ChangeDateAction = ({ item, type }: { item: object; type: string }) => {
    return (
      <Action.PickDate
        title="Change Date"
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        onChange={(e) => handleChangeDateItem(e, item as CalItem, type)}
      />
    );
  };
  //#endregion

  //#region CALENDAR HANDLER
  const tmEvents = [...events].map((e) => {
    return { ...e, start: tmDate(new Date(e.start)).toISOString(), end: tmDate(new Date(e.end)).toISOString() };
  });
  const tmKeystones = [...keystones].map((k) => {
    return { ...k, date: tmDate(new Date(k.date)).toISOString() };
  });
  const calendar = calendarConverter(tmEvents as Evnt[], tmKeystones as Keystone[], filter, search);
  //#endregion

  return (
    <List
      isShowingDetail={showDetail}
      searchBarPlaceholder={addType === "Nothing" ? "Search Keystones, Events..." : "Enter " + addType + " Name"}
      searchText={search}
      onSearchTextChange={(e) => setSearch(e)}
      onSelectionChange={onSelectionChanged}
      searchBarAccessory={isLoading ? <></> : <SearchBarAccessories />}
    >
      {isLoading && firstLoad ? (
        <EmptyView type="Calendar" />
      ) : (
        <>
          <MyCalendar />
          {addType !== "Nothing" ? <></> : <CalendarSection calendar={calendar} />}
        </>
      )}
    </List>
  );
};

//#region CALENDAR FUNCTIONS
const calendarConverter = (events: Evnt[], keystones: Keystone[], filter: string, search: string) => {
  const calendar: CalItem[] = [];

  if (events !== null)
    nameSearchFilter(events, search).forEach((e) => {
      const event = e as Evnt;
      const item: CalItem = {
        id: event.id,
        name: event.name,
        dateInfos:
          event.start.slice(0, 10) +
          "-" +
          event.start.slice(11, 16) +
          (event.end == null ? "" : "→" + event.end.slice(11, 16)),
        startDate: event.start,
        project: event.project,
        type: "event",
        todos: [],
        days: [],
      };
      calendar.push(item);
    });
  if (keystones !== null)
    nameSearchFilter(keystones, search).forEach((k) => {
      const keystone = k as Keystone;
      const item: CalItem = {
        id: keystone.id,
        name: keystone.name,
        dateInfos: keystone.date.slice(0, 10),
        startDate: keystone.date,
        project: keystone.project,
        type: "keystone",
        todos: keystone.todos,
        days: [],
      };
      calendar.push(item);
    });
  const finalCalendar = filterByProject(calendar, filter);
  return finalCalendar;
};

const sortedByDate = (items: CalItem[]) => {
  const sortedItems: CalItem[] = [...items];
  sortedItems.sort((a: CalItem, b: CalItem) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  return sortedItems;
};

const groupByDate = (items: CalItem[]) => {
  const sections: CalSection[] = [];
  const today = new Date();
  items.forEach((item: CalItem) => {
    const date = new Date(item.startDate);
    const number = date.getDate();
    const month = date.getMonth();
    if (
      new Date(today.toISOString().slice(0, 10)).getTime() <= new Date(date.toISOString().slice(0, 10)).getTime() ||
      (item.type === "keystone" && new Date(today.getDate() - 1).getTime() < date.getTime())
    ) {
      //IF TODAY
      if (today.toISOString().slice(0, 10) === date.toISOString().slice(0, 10)) {
        if (sections.some((s) => s.name === "Today")) sections.find((s) => s.name === "Today")?.items.push(item);
        else {
          const section: CalSection = { name: "Today", items: [item], order: -1, type: "today" };
          sections.push(section);
        }
      }

      //SI CETTE SEMAINE
      if (
        month === today.getMonth() &&
        number - today.getDate() < 7 &&
        today.toISOString().slice(0, 10) !== date.toISOString().slice(0, 10)
      ) {
        if (sections.some((s) => s.name === "This week"))
          sections.find((s) => s.name === "This week")?.items.push(item);
        else {
          const section: CalSection = { name: "This week", items: [item], order: 0, type: "week" };
          sections.push(section);
        }
      }
      //CE MOIS
      if (month === today.getMonth() && number - today.getDate() >= 7) {
        if (sections.some((s) => s.name === "This month"))
          sections.find((s) => s.name === "This month")?.items.push(item);
        else {
          const section: CalSection = { name: "This month", items: [item], order: 1, type: "month" };
          sections.push(section);
        }
      }
      //OTHER MONTH
      if (month !== today.getMonth()) {
        if (sections.some((s) => s.name === getMounthStringByMonthNumber(month)))
          sections.find((s) => s.name === getMounthStringByMonthNumber(month))?.items.push(item);
        else {
          let order = month - today.getMonth() + 1;
          if (order < 0) order = order + 12;
          const section: CalSection = {
            name: getMounthStringByMonthNumber(month),
            items: [item],
            order: order,
            type: "year",
          };
          sections.push(section);
        }
      }
    }
  });

  sections.map((section) => (section.items = sortedByDate(section.items)));
  sections.sort((a, b) => a.order - b.order);
  return sections;
};

const filterByProject = (items: CalItem[], filter: string) => {
  if (filter === "Nothing") return groupByDate(items);
  const filterItems = items.filter((item) => item.project.name === filter);
  const groupedItems = groupByDate(filterItems);
  return groupedItems;
};

const retrieveDateInfos = (dateInfos: string, showDetail: boolean) => {
  const date = showDetail ? getDateMounthAndNumber(dateInfos.slice(0, 10)) : getDayDateAndMouth(dateInfos.slice(0, 10));
  const hours = dateInfos.slice(11);
  return date + (showDetail ? "" : ", " + hours);
};

const getDiff = (addTime: string | null) => {
  let min = 15;
  switch (addTime) {
    case ADDTIMES.a:
      min = 15;
      break;
    case ADDTIMES.b:
      min = 30;
      break;
    case ADDTIMES.c:
      min = 60;
      break;
    case ADDTIMES.d:
      min = 120;
      break;
    case ADDTIMES.e:
      min = 240;
      break;
    case null:
      break;
    default:
      break;
  }
  return min * 60000;
};

//#endregion

export default CalendarView;
