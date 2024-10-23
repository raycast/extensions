import { Action, ActionPanel, Color, Icon, LaunchProps, List, Toast, confirmAlert, showToast } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { Keystone, Project, Todo } from "../../interfaces/interfaceItems";

import { getDateAndMohth, getDateMounthAndNumber, getDayDateAndMouth, progbar } from "../../tools/generalTools";

import {
  QueryAddTodo,
  QuerySetKeystoneAndTodo,
  QueryToogleTodo,
  QueryUnlinkTodo,
} from "../../queriesFunctions/TodosQueries";
import { QueryAddKeystone, QueryChangeDateKeystone } from "../../queriesFunctions/KeystonesQueries";
import { QueryDeleteItem } from "../../queriesFunctions/GeneralQueries";
import { dateOrder, projectFilter } from "../../tools/filtersTools";

import UseOAuth from "../../fetch/useOAuth";
import useDBLinkHook from "../../hooks/DBLinkHook";
import useFetchCachTaskManager from "../../fetch/useFetchCachTaskManager";
import { Client } from "@notionhq/client";
import CheckDBDetail from "../details/CheckDBDetail";

interface TodoItemProps {
  todo: Todo;
}
interface KeystoneItemProps {
  keystone: Keystone;
}

const VTEXT = {
  at: "alltodos",
  lk: "linkToKeystone",
  ak: "allkeystones",
};

const TaskManagementView = ({ launchProps }: { launchProps: LaunchProps | undefined }) => {
  //#region NOTION HOOKS
  const { linked } = useDBLinkHook();
  const { notion } = UseOAuth();
  const { isLoading, projects, todos, keystones, refresh } = useFetchCachTaskManager(notion as Client, linked);

  //#endregion

  //#region STATES
  const [search, setSearch] = useState<string>("");
  const [filter, setFilter] = useState<string>("Nothing");
  const [showDetail, setShowDetail] = useState<boolean>(true);
  const [showDone, setShowDone] = useState<boolean>(true);
  const [addType, setAddType] = useState<string>("Nothing");
  const [view, setView] = useState<string>(VTEXT.at);
  //#endregion

  //#region ON CHANGE
  const onChangeProjectFilter = (project: string) => {
    setFilter(project);
  };
  const onSelectionChange = (id: string | null) => {
    if (view === VTEXT.lk) return;
    if (id === "tm" || id?.includes("allkey") || id === "nokeylinked") setShowDetail(true);
    else if (id?.includes("todos")) setShowDetail(false);
  };
  const onChangeView = (e: string) => {
    if (e === VTEXT.lk) {
      if (keystones === null) {
        showToast({ title: "Please add Keystone before", style: Toast.Style.Failure });
        return;
      }
    }
    setView(e);
  };

  const onChangeAddType = (e: string) => {
    setAddType(e);
  };
  const onChangeShowDone = (e: boolean) => {
    setShowDone(e);
  };
  //#endregion

  //#region HANDLE FUNCTIONS
  const handleToogleTodo = async (todo: Todo) => {
    showToast({ title: "Toogling Todo", style: Toast.Style.Animated });
    await QueryToogleTodo(todo, notion);
    refresh();
    showToast({ title: "Todo Toogled !", style: Toast.Style.Success });
  };
  const handleAddTodo = async () => {
    showToast({ title: "Adding Todo", style: Toast.Style.Animated });
    await QueryAddTodo(projects, filter, search, notion);
    refresh();
    showToast({ title: "Todo Added !", style: Toast.Style.Success });
  };
  const handleChangePickDateKeystone = async (date: Date | null, id: string) => {
    showToast({ title: "Changing Keystone Date", style: Toast.Style.Animated });
    if (date === null) return;
    await QueryChangeDateKeystone(id, date.toISOString(), notion);
    refresh();
    showToast({ title: "Date Changed !", style: Toast.Style.Success });
  };
  const handleLinkToKeystone = async (todo: Todo, keystone: Keystone) => {
    showToast({ title: "Linking Keystone and Todo", style: Toast.Style.Animated });
    await QuerySetKeystoneAndTodo(keystone as Keystone, todo, notion);
    refresh();
    showToast({ title: "Keysytone and Todo Linked !", style: Toast.Style.Success });
  };
  const handleUnlinkKeystone = async (todo: Todo) => {
    showToast({ title: "Unlinking Todo", style: Toast.Style.Animated });
    await QueryUnlinkTodo(todo.id, notion);
    refresh();
    showToast({ title: "Keysytone and Todo Unlinked !", style: Toast.Style.Success });
  };

  const handleAddKeystone = async (date: Date | null) => {
    showToast({ title: "Adding Keystone", style: Toast.Style.Animated });
    const projectID = projects.find((p) => p.name === filter)?.id;
    if (date === null || projectID === undefined) return;
    await QueryAddKeystone(search, date.toISOString(), projectID, [], notion);
    refresh();
    showToast({ title: "Keysytone Added !", style: Toast.Style.Success });
  };

  const handleDeleteItem = async (itemID: string) => {
    if (await confirmAlert({ title: "Are you sure you want to delete this item" })) {
      showToast({ title: "Deleting Item", style: Toast.Style.Animated });
      await QueryDeleteItem(itemID, notion);
      refresh();
      showToast({ title: "Item Deleted !", style: Toast.Style.Success });
    }
  };
  //#endregion

  //#region YOUR TASK ITEMS
  const YourTaskItem = () => {
    const actions = (
      <ActionPanel>
        {filter === "Nothing" ? (
          <Action icon={Icon.NewDocument} title="Select a Project" />
        ) : addType === "Nothing" ? (
          <Action icon={Icon.NewDocument} title="Select a Type" />
        ) : search === "" ? (
          <Action icon={Icon.NewDocument} title="Enter a Name" />
        ) : addType === "todo" ? (
          <Action
            icon={Icon.NewDocument}
            title={"Add New Todo"}
            onAction={() => {
              handleAddTodo();
            }}
          />
        ) : addType === "keystone" ? (
          <Action.PickDate
            icon={Icon.NewDocument}
            title={"Add New " + addType}
            onChange={(e) => {
              handleAddKeystone(e);
            }}
          />
        ) : (
          <></>
        )}
        <ToogleVueAction />
        <RefreshAction />
        {/* <ClearRefreshAction clearRefresh={refresh([])} setShow={setShowDetail} /> */}
      </ActionPanel>
    );

    const accessories = showDetail
      ? []
      : [{ tag: { value: progbar(todos.filter((t) => t.checkbox).length, todos.length, true) } }];

    return (
      <List.Item
        id="tm"
        title={view === VTEXT.at ? "Your Tasks" : "Your Keystones"}
        icon={view === VTEXT.at ? "📋" : "📍"}
        actions={actions}
        accessories={accessories}
        detail={<List.Item.Detail metadata={<YourTaskMetadata />} />}
      />
    );
  };

  const YourTaskMetadata = () => {
    let title;
    if (view === VTEXT.at) {
      const fTodos = filter === "Nothing" ? todos : todos.filter((todo) => todo.project.name === filter);
      title =
        fTodos.length === 0
          ? "No todos 😢"
          : progbar(fTodos.filter((t) => t.checkbox === true).length, fTodos.length, true);
    } else {
      const fKeystones =
        filter === "Nothing" ? keystones : keystones.filter((keystone) => keystone.project.name === filter);
      let fKDones = 0;
      fKeystones.forEach((k) => {
        if (k.todos.filter((t) => t.checkbox === true).length === k.todos.length && k.todos.length !== 0) {
          fKDones = fKDones + 1;
        }
      });
      title = fKeystones.length === 0 ? "No Keystones 😢" : progbar(fKDones, fKeystones.length, true);
    }

    return (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title={view === VTEXT.at ? "Your Tasks" : "Your Keystones"} text={title} />

        <List.Item.Detail.Metadata.TagList title="🔁 Views">
          <List.Item.Detail.Metadata.TagList.Item
            text="📋 Todos"
            color={view === VTEXT.at ? Color.PrimaryText : Color.SecondaryText}
            onAction={() => onChangeView(VTEXT.at)}
          />
          <List.Item.Detail.Metadata.TagList.Item
            text="📍 Keystones"
            color={view === VTEXT.ak ? Color.PrimaryText : Color.SecondaryText}
            onAction={() => onChangeView(VTEXT.ak)}
          />
        </List.Item.Detail.Metadata.TagList>
        <List.Item.Detail.Metadata.TagList title={showDone ? "✅ Showing Done" : "🟥 Hiding Done"}>
          <List.Item.Detail.Metadata.TagList.Item
            text={showDone ? "Hide" : "Show"}
            color={showDone ? Color.PrimaryText : Color.SecondaryText}
            onAction={() => onChangeShowDone(!showDone)}
          />
        </List.Item.Detail.Metadata.TagList>

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label
          title="⏩ Quick Add"
          text={
            filter === "Nothing"
              ? "Select a project to add item"
              : addType === "Nothing"
                ? "Select a type to add"
                : search === ""
                  ? "Enter Name in Search"
                  : "Add New " + addType
          }
        />
        <List.Item.Detail.Metadata.TagList title="">
          {filter === "Nothing" ? (
            <List.Item.Detail.Metadata.TagList.Item text="Select a project to add item" color={Color.SecondaryText} />
          ) : (
            <>
              <List.Item.Detail.Metadata.TagList.Item
                text="📋 Todo"
                color={addType === "todo" ? Color.PrimaryText : Color.SecondaryText}
                onAction={() => onChangeAddType("todo")}
              />
              <List.Item.Detail.Metadata.TagList.Item
                text="📍 Keystone"
                color={addType === "keystone" ? Color.PrimaryText : Color.SecondaryText}
                onAction={() => onChangeAddType("keystone")}
              />
              {addType === "Nothing" ? (
                <></>
              ) : (
                <List.Item.Detail.Metadata.TagList.Item
                  text="Cancel"
                  color={Color.Red}
                  onAction={() => {
                    onChangeAddType("Nothing"), setSearch("");
                  }}
                />
              )}
            </>
          )}
        </List.Item.Detail.Metadata.TagList>
      </List.Item.Detail.Metadata>
    );
  };
  //#endregion

  //#region GROUPED
  const AllTodosSection = () => {
    const filteredTodos =
      search === "" ? projectFilter(filter, todos) : filterTodos(projectFilter(filter, todos) as Todo[], search);
    return todos === null ? (
      <></>
    ) : (
      <List.Section title="Todos">
        {filteredTodos.map((t, i: number) => {
          const todo = t as Todo;
          if (todo.checkbox && !showDone) return;
          return <TodoItem todo={t as Todo} key={i} />;
        })}
      </List.Section>
    );
  };
  const AllKeystonesSection = () => {
    const filteredKeystones =
      search === ""
        ? projectFilter(filter, dateOrder(keystones))
        : filterKeystones(projectFilter(filter, dateOrder(keystones)) as Keystone[], search);
    return keystones === null ? (
      <></>
    ) : (
      <List.Section title="Keystones">
        {filteredKeystones.map((item) => {
          const keystone = item as Keystone;
          const done = keystone.todos.filter((t) => t.checkbox === true).length;
          if (done === keystone.todos.length && !showDone) return;
          return <KeystoneItem keystone={keystone} key={keystone.id} />;
        })}
      </List.Section>
    );
  };

  const KeystoneItem = (props: KeystoneItemProps) => {
    const [linkingTodos, setLinkingTodos] = useState<boolean>(false);

    const { keystone } = props;
    const done = keystone.todos.filter((t) => t.checkbox === true).length;
    return (
      <List.Item
        title={keystone.name}
        id={keystone.id + "allkey"}
        icon={keystone.todos.length === 0 ? "0️⃣" : done === keystone.todos.length ? "✅" : "🟥"}
        accessories={[{ tag: { value: "📍 " + getDateAndMohth(keystone.date) } }]}
        actions={
          <ActionPanel>
            <Action
              icon={Icon.Link}
              title={"Link Todos"}
              onAction={() => {
                setLinkingTodos(!linkingTodos);
              }}
            />
            <Action.PickDate
              icon={Icon.Calendar}
              title="Change Keystone Date"
              onChange={(e) => handleChangePickDateKeystone(e, keystone.id)}
            />
            <ToogleVueAction />
            <DeleteAction itemID={keystone.id} />
            <RefreshAction />
          </ActionPanel>
        }
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label
                  title={keystone.name}
                  text={keystone.todos.length === 0 ? "No Todos 😢" : progbar(done, keystone.todos.length, true)}
                />
                <List.Item.Detail.Metadata.TagList title={getDayDateAndMouth(keystone.date)}>
                  <List.Item.Detail.Metadata.TagList.Item text={keystone.project.icon + " " + keystone.project.name} />
                </List.Item.Detail.Metadata.TagList>
                {keystone.todos.length === 0 ? (
                  <></>
                ) : (
                  <>
                    <List.Item.Detail.Metadata.Separator />
                    {keystone.todos.map((todo) => {
                      if (showDone === false && todo.checkbox) return;
                      return (
                        <List.Item.Detail.Metadata.TagList title={todo.name} key={todo.id}>
                          <List.Item.Detail.Metadata.TagList.Item
                            onAction={() => handleToogleTodo(todo)}
                            text={todo.checkbox ? "✅" : "🟥"}
                            color={todo.checkbox ? Color.Green : Color.Red}
                          />
                        </List.Item.Detail.Metadata.TagList>
                      );
                    })}
                  </>
                )}

                {!linkingTodos ? (
                  <></>
                ) : (
                  <>
                    <List.Item.Detail.Metadata.Separator />
                    {todos.map((todo) => {
                      if (todo.keystone.name.length === 0) {
                        return (
                          <List.Item.Detail.Metadata.TagList title={todo.name} key={todo.id}>
                            <List.Item.Detail.Metadata.TagList.Item
                              color={Color.Blue}
                              icon={"🔗"}
                              onAction={() => {
                                handleLinkToKeystone(todo, keystone);
                              }}
                            />
                          </List.Item.Detail.Metadata.TagList>
                        );
                      }
                    })}
                  </>
                )}
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    );
  };

  const TodoItem = (p: TodoItemProps) => {
    const todo = p.todo;

    const projectAccessorie =
      filter !== "Nothing" ? { text: "" } : { tag: { value: todo.project.icon + " " + todo.project.name } };
    const accessories = [
      todo.keystone.name.length === 0
        ? { text: "" }
        : { tag: { value: "📍 " + getDateMounthAndNumber(todo.keystone.date) } },
      projectAccessorie,
    ];
    return (
      <List.Item
        title={todo.name}
        icon={todo.checkbox ? "✅" : "🟥"}
        id={"todos" + todo.id}
        accessories={showDetail ? [] : accessories}
        detail={<List.Item.Detail metadata={view === VTEXT.lk ? <YourTaskMetadata /> : <></>} />}
        actions={
          <ActionPanel>
            <Action title="Toogle" icon={Icon.Repeat} onAction={() => handleToogleTodo(todo)} />
            {todo.keystone.name.length !== 0 ? (
              <Action title="Unlink to Keystone" icon={Icon.PinDisabled} onAction={() => handleUnlinkKeystone(todo)} />
            ) : (
              <></>
            )}
            <ToogleVueAction />
            <DeleteAction itemID={todo.id} />
            <RefreshAction />
          </ActionPanel>
        }
      />
    );
  };
  //#endregion

  //#region SEARCHBAR ACCESORIES
  const SearchBarAccessories = () => {
    return (
      <List.Dropdown tooltip="Search todos" onChange={onChangeProjectFilter} value={filter}>
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
  const ToogleVueAction = () => {
    let text = "";
    if (view === VTEXT.ak) text = VTEXT.at;
    else if (view === VTEXT.at) text = VTEXT.ak;
    return (
      <Action
        title="Toogle Vue"
        icon={Icon.Eye}
        shortcut={{ modifiers: ["cmd"], key: "v" }}
        onAction={() => onChangeView(text)}
      />
    );
  };

  const DeleteAction = ({ itemID }: { itemID: string }) => {
    return (
      <Action
        title={"Delete"}
        icon={Icon.Trash}
        shortcut={{ modifiers: ["cmd"], key: "x" }}
        style={Action.Style.Destructive}
        onAction={() => handleDeleteItem(itemID)}
      />
    );
  };
  const RefreshAction = () => {
    return (
      <Action
        title="Refresh"
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        icon={Icon.ArrowCounterClockwise}
        onAction={() => {
          refresh();
        }}
      />
    );
  };

  //#endregion

  const filterTodos = (todos: Todo[], search: string) => {
    const lowerSearch = search.toLowerCase();
    const filteredTodos: Todo[] = [];
    todos.forEach((todo) => {
      if (
        todo.name.toLowerCase().includes(lowerSearch) ||
        todo.project.name.toLowerCase().includes(lowerSearch) ||
        todo.keystone.date.includes(lowerSearch) ||
        getDayDateAndMouth(todo.keystone.date).toLowerCase().includes(lowerSearch) ||
        (todo.checkbox && "done".includes(lowerSearch)) ||
        (!todo.checkbox && "undone".includes(lowerSearch))
      )
        filteredTodos.push(todo);
    });
    return filteredTodos;
  };
  const filterKeystones = (keystones: Keystone[], search: string) => {
    const lowerSearch = search.toLowerCase();
    const filteredkeystones: Keystone[] = [];
    keystones.forEach((keystone) => {
      if (
        keystone.name.toLowerCase().includes(lowerSearch) ||
        keystone.project.name.toLowerCase().includes(lowerSearch) ||
        keystone.date.includes(lowerSearch) ||
        getDayDateAndMouth(keystone.date).toLowerCase().includes(lowerSearch)
      )
        filteredkeystones.push(keystone);
    });
    return filteredkeystones;
  };

  useEffect(() => {
    if (notion !== undefined) {
      if (launchProps !== undefined && launchProps.launchContext !== undefined) {
        if (launchProps.launchContext.type === "toogleTodo") {
          handleToogleTodo(launchProps.launchContext.props.todo);
        }
      }
    }
  }, [notion]);

  return linked ? (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      searchBarPlaceholder={
        addType === "Nothing" ? "Search " + (view === VTEXT.at ? "Todos..." : "Keystones...") : "Enter New " + addType
      }
      searchText={search}
      onSearchTextChange={setSearch}
      onSelectionChange={onSelectionChange}
      searchBarAccessory={isLoading ? <></> : <SearchBarAccessories />}
    >
      <YourTaskItem />
      {addType !== "Nothing" ? (
        <></>
      ) : view === VTEXT.at ? (
        <AllTodosSection />
      ) : view === VTEXT.ak ? (
        <AllKeystonesSection />
      ) : (
        <></>
      )}
    </List>
  ) : (
    <CheckDBDetail notion={notion} />
  );
};

export default TaskManagementView;
