import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import UseOAuth from "../../fetch/useOAuth";
import React, { useEffect, useState } from "react";
import { Journal, Project } from "../../interfaces/interfaceItems";
import { br, code, h2, sepa } from "../../tools/markdownTools";
import { getDayDateAndMouth, getTimesText } from "../../tools/generalTools";
import { QueryDeleteItem } from "../../queriesFunctions/GeneralQueries";
import { QueryAddJournal, QueryAddTextJournal, QueryChangeDateJournal } from "../../queriesFunctions/JournalsQueries";
import { QuerySetTodosUndoneFromJournal } from "../../queriesFunctions/TodosQueries";
import TimezoneHook from "../../tools/TimezoneHook";
import { projectFilter } from "../../tools/filtersTools";
import { ClearRefreshAction } from "../actions/actions";
import EmptyView from "./EmptyView";
import useFetchJournals from "../../fetch/useFetchJournals";

//#region INTERFACES
interface JournalItemProps {
  journal: Journal;
}
interface DeleteActionProps {
  journal: Journal;
}
//#endregion

const JournalView = () => {
  //#region NOTION HOOK
  const { notion } = UseOAuth();
  const { isLoading, projects, clearRefresh, journals, refresh } = useFetchJournals(notion);
  const { tmDate } = TimezoneHook();

  useEffect(() => {
    if (isLoading) showToast({ style: Toast.Style.Animated, title: "Loading..." });
    else {
      if (firstLoad) setFirstLoad(false);
      showToast({ style: Toast.Style.Success, title: "Loaded successfully" });
    }
  }, [isLoading]);
  //#endregion

  //#region STATES
  const [showDetail, setShowDetail] = useState<boolean>(true);
  const [filter, setFilter] = useState<string>("Nothing");
  const [search, setSearch] = useState<string>("");
  const [firstLoad, setFirstLoad] = useState<boolean>(true);
  const [addTextJournal, setAddTextJournal] = useState<string | null>(null);
  //#endregion

  //#region ON FUNCTIONS
  const onChangeSelection = (id: string | null) => {
    if (id?.includes("page")) setShowDetail(true);
    else setShowDetail(false);
  };

  const onChangeProjectFilter = (project: string) => {
    setFilter(project);
  };
  const onActiveAddTextJournal = (journalID: string) => {
    if (journalID === addTextJournal) setAddTextJournal(null);
    else setAddTextJournal(journalID);
    setSearch("");
  };
  //#endregion

  //#region HANDLE FUNCTIONS
  const handleAddText = async (journal: Journal) => {
    showToast({ title: "Adding Text", style: Toast.Style.Animated });
    setSearch("");
    const text = journal.text + br + search;
    await QueryAddTextJournal(journal.id, text, notion);
    refresh(["journal"]);
  };
  const handleDeleteItem = async (journal: Journal) => {
    showToast({ title: "Deleting journal", style: Toast.Style.Animated });
    await QuerySetTodosUndoneFromJournal(journal, notion);
    await QueryDeleteItem(journal.id, notion);
    //DELETE LES TODOS AUSSI
    refresh(["journal"]);
  };
  const handleAddJournal = async (date: Date | null) => {
    showToast({ title: "Adding journal", style: Toast.Style.Animated });
    const projectID = projects?.find((p) => p.name === filter)?.id;
    await QueryAddJournal(
      "",
      date?.toISOString() as string,
      filter,
      projectID as string,
      date?.toISOString().slice(0, 10) as string,
      notion,
    );
    refresh(["journal"]);
  };
  const handleChangeDateItem = async (date: Date | null, journal: Journal) => {
    showToast({ title: "Changing Keystone Date", style: Toast.Style.Animated });
    if (date === null) return;
    await QueryChangeDateJournal(journal.id, date.toISOString(), notion);
    refresh(["journal"]);
  };
  //#endregion

  //#region MY JOURNAL
  const MyJournal = () => {
    if (addTextJournal !== null) return <></>;
    return (
      <List.Item
        title={"📔 " + "My Journal"}
        id="mj"
        actions={
          <ActionPanel>
            {filter === "Nothing" ? (
              <Action style={Action.Style.Destructive} title={"Select Project to Add Journal"} />
            ) : (
              <Action.PickDate title={"Add New Journal Page"} onChange={handleAddJournal} />
            )}
            <RefreshAction />
            <ClearRefreshAction setFirst={setFirstLoad} setShow={setShowDetail} clearRefresh={clearRefresh} />
          </ActionPanel>
        }
      />
    );
  };

  //#endregion

  //#region JOURNALS SECTION & ITEMS

  const sectioningJournals = (journals: Journal[]) => {
    const sections: Section[] = [];
    const now = tmDate(new Date());

    journals.forEach((journal) => {
      const date = tmDate(new Date(journal.date));
      if (now.getTime() < date.getTime()) return;
      //TODAY
      if (now.toISOString().slice(0, 10) === date.toISOString().slice(0, 10)) {
        if (sections.some((s) => s.name === "Today")) sections.find((s) => s.name === "Today")?.journals.push(journal);
        else {
          const section: Section = { name: "Today", journals: [journal], order: 0 };
          sections.push(section);
        }
      }
      //YESTERDAY
      else if (new Date(now.getDate() - 1).toISOString().slice(0, 10) === date.toISOString().slice(0, 10)) {
        if (sections.some((s) => s.name === "Yesterday"))
          sections.find((s) => s.name === "Yesterday")?.journals.push(journal);
        else {
          const section: Section = { name: "Yesterday", journals: [journal], order: 1 };
          sections.push(section);
        }
      }
      //THIS WEEK
      else if (now.getTime() - date.getTime() < 604800001 && now.getDay() > date.getDay()) {
        if (sections.some((s) => s.name === "This Week"))
          sections.find((s) => s.name === "This Week")?.journals.push(journal);
        else {
          const section: Section = { name: "This Week", journals: [journal], order: 2 };
          sections.push(section);
        }
      }
      //THIS MOUNTH
      else if (now.getTime() - date.getTime() < 2678400000 && now.getMonth() === date.getMonth()) {
        if (sections.some((s) => s.name === "This Month"))
          sections.find((s) => s.name === "This Month")?.journals.push(journal);
        else {
          const section: Section = { name: "This Month", journals: [journal], order: 3 };
          sections.push(section);
        }
      } else {
        if (sections.some((s) => s.name === "Before"))
          sections.find((s) => s.name === "Before")?.journals.push(journal);
        else {
          const section: Section = { name: "Before", journals: [journal], order: 4 };
          sections.push(section);
        }
      }
    });
    sections.sort((a, b) => {
      return a.order - b.order;
    });
    return sections;
  };

  const JournalSection = () => {
    const filteredSearchJournal = filterSearchJournals(journals as Journal[], search);
    const filteredJournal = projectFilter(filter, filteredSearchJournal);
    const sectionnedJournal = sectioningJournals(filteredJournal as Journal[]);
    return sectionnedJournal.map((section) => {
      return (
        <List.Section title={section.name} key={section.name}>
          {section.journals.map((journal) => {
            return <JournalItem journal={journal} key={journal.id} />;
          })}
        </List.Section>
      );
    });
  };

  const JournalItem = (p: JournalItemProps) => {
    const { journal } = p;
    if (addTextJournal !== null && addTextJournal !== journal.id) return <></>;
    return (
      <List.Item
        title={getDayDateAndMouth(journal.date)}
        id={journal.id + "page"}
        accessories={[{ tag: { value: journal.project.icon + " " + journal.project.name } }]}
        actions={
          <ActionPanel>
            {addTextJournal === null ? (
              <Action title="Add Text to Journal" onAction={() => onActiveAddTextJournal(journal.id)} />
            ) : (
              <>
                <Action
                  title={search === "" ? "Enter New Text in Search" : "Add New Text"}
                  style={search === "" ? Action.Style.Destructive : Action.Style.Regular}
                  onAction={search !== "" ? () => handleAddText(journal) : () => {}}
                />
                <Action
                  title="Quit"
                  style={Action.Style.Destructive}
                  onAction={() => onActiveAddTextJournal(journal.id)}
                />
              </>
            )}
            <ChangeDateAction journal={journal} />
            <DeleteAction journal={journal} />
          </ActionPanel>
        }
        detail={
          <List.Item.Detail
            metadata={
              addTextJournal !== journal.id ? (
                <></>
              ) : (
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.TagList title="Command + Enter to">
                    <List.Item.Detail.Metadata.TagList.Item
                      text="Cancel"
                      color={Color.Red}
                      onAction={() => onActiveAddTextJournal(journal.id)}
                    />
                  </List.Item.Detail.Metadata.TagList>
                </List.Item.Detail.Metadata>
              )
            }
            markdown={JournalItemMK(journal)}
          />
        }
      />
    );
  };
  const JournalItemMK = (journal: Journal) => {
    const { hours, min } = getTimesText(journal.times);
    const timeText = journal.times === 0 ? "" : code("⏰ You worked " + hours + " hours & " + min + " minutes");
    let mk = "";
    mk = h2(getDayDateAndMouth(journal.date)) + br + timeText + " " + br + journal.text + " " + br;
    let journalTodos = "";
    journal.todos.forEach((t) => {
      journalTodos = journalTodos + code(t.name) + " " + br + " ";
    });
    mk = journal.todos.length !== 0 ? mk + sepa + br + journalTodos : mk;
    return mk;
  };
  //#endregion

  //#region SEARCHBAR ACCESORIES
  const SearchBarAccessories = () => {
    return (
      <List.Dropdown tooltip="Search todos" onChange={onChangeProjectFilter} value={filter}>
        <List.Dropdown.Item title="Nothing" value="Nothing" />
        <List.Dropdown.Section title="Projects">
          {projects?.map((project: Project, i: number) => {
            return <List.Dropdown.Item key={i} value={project.name} title={project.name} icon={project.icon} />;
          })}
        </List.Dropdown.Section>
      </List.Dropdown>
    );
  };
  //#endregion

  const filterSearchJournals = (journals: Journal[], search: string) => {
    if (addTextJournal !== null) return journals;
    const filteredJournals: Journal[] = [];
    journals.forEach((journal) => {
      if (
        journal.date.includes(search) ||
        journal.project.name.toLowerCase().includes(search) ||
        getDayDateAndMouth(journal.date).toLowerCase().includes(search)
      )
        filteredJournals.push(journal);
    });
    return filteredJournals;
  };

  //#region ACTIONS
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
  const DeleteAction = (p: DeleteActionProps) => {
    const { journal } = p;
    return (
      <Action
        title="Delete"
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["cmd"], key: "x" }}
        onAction={() => handleDeleteItem(journal)}
        icon={Icon.Trash}
      />
    );
  };
  const ChangeDateAction = ({ journal }: { journal: Journal }) => {
    return (
      <Action.PickDate
        title="Change Date"
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        onChange={(e) => handleChangeDateItem(e, journal)}
      />
    );
  };
  //#endregion

  return (
    <List
      // isLoading={isLoading}
      isShowingDetail={showDetail}
      onSelectionChange={onChangeSelection}
      searchText={search}
      searchBarPlaceholder={addTextJournal ? "Add Text to Journal" : "Search Journals"}
      onSearchTextChange={(e) => {
        setSearch(e);
      }}
      searchBarAccessory={<SearchBarAccessories />}
    >
      {firstLoad && isLoading ? (
        <EmptyView type="Journals" />
      ) : (
        <>
          <MyJournal />
          <JournalSection />
        </>
      )}
    </List>
  );
};

interface Section {
  name: string;
  journals: Journal[];
  order: number;
}

export default JournalView;
