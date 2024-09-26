import { Action, ActionPanel, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { Keystone, Project, Todo } from "../../interfaces/interfaceItems";

import { getDateAndMohth, getDateMounthAndNumber, getDayDateAndMouth, progbar } from "../../tools/generalTools";
import UseOAuth from "../../fetch/useOAuth";
import useFetchTaskManagement from "../../fetch/useFetchTaskManagement";
import {
  QueryAddTodo,
  QuerySetKeystoneAndTodo,
  QueryToogleTodo,
  QueryUnlinkTodo,
} from "../../queriesFunctions/TodosQueries";
import { QueryAddKeystone, QueryChangeDateKeystone } from "../../queriesFunctions/KeystonesQueries";
import { QueryDeleteItem } from "../../queriesFunctions/GeneralQueries";
import { dateOrder, projectFilter } from "../../tools/filtersTools";
import { ClearRefreshAction } from "../actions/actions";
import EmptyView from "./EmptyView";

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

const TaskManagementView = () => {
  //#region NOTION HOOKS
  const { notion } = UseOAuth();
  const { refresh, projects, clearRefresh, isLoading, todos, keystones } = useFetchTaskManagement(notion);

  useEffect(() => {
    if (isLoading) showToast({ title: "Loading...", style: Toast.Style.Animated });
    else {
      showToast({ title: "Loaded successfully", style: Toast.Style.Success });
      if (firstLoad) setFirstLoad(false);
    }
  }, [isLoading]);
  //#endregion

  //#region STATES
  const [search, setSearch] = useState<string>("");
  const [filter, setFilter] = useState<string>("Nothing");
  const [firstLoad, setFirstLoad] = useState<boolean>(true);
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
    else setShowDetail(false);
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
    setTimeout(() => {
      refresh(["todo", "keystone"]);
    }, 5000);
  };
  const handleAddTodo = async () => {
    showToast({ title: "Adding Todo", style: Toast.Style.Animated });
    await QueryAddTodo(projects, filter, search, notion);
    refresh(["todo"]);
  };
  const handleChangePickDateKeystone = async (date: Date | null, id: string) => {
    showToast({ title: "Changing Keystone Date", style: Toast.Style.Animated });
    if (date === null) return;
    await QueryChangeDateKeystone(id, date.toISOString(), notion);
    refresh(["keystone"]);
  };
  const handleLinkToKeystone = async (todo: Todo, keystone: Keystone) => {
    showToast({ title: "Linking Keystone and Todo", style: Toast.Style.Animated });
    await QuerySetKeystoneAndTodo(keystone as Keystone, todo, notion);
    setTimeout(() => {
      refresh(["todo", "keystone"]);
    }, 5000);
  };
  const handleUnlinkKeystone = async (todo: Todo) => {
    showToast({ title: "Unlinking Todo", style: Toast.Style.Animated });
    await QueryUnlinkTodo(todo.id, notion);
    setTimeout(() => {
      refresh(["todo", "keystone"]);
    }, 5000);
  };

  const handleAddKeystone = async (date: Date | null) => {
    showToast({ title: "Adding Keystone", style: Toast.Style.Animated });
    const projectID = projects.find((p) => p.name === filter)?.id;
    if (date === null || projectID === undefined) return;
    await QueryAddKeystone(search, date.toISOString(), projectID, [], notion);
    refresh(["keystone"]);
  };

  const handleDeleteItem = async (itemID: string) => {
    if (await confirmAlert({ title: "Are you sure you want to delete this item" })) {
      showToast({ title: "Deleting Item", style: Toast.Style.Animated });
      await QueryDeleteItem(itemID, notion);
      setTimeout(() => {
        refresh(["todo", "keystone"]);
      }, 5000);
    }
  };
  //#endregion

  //#region YOUR TASK ITEMS
  const YourTaskItem = () => {
    const actions = (
      <ActionPanel>
        {filter === "Nothing" ? (
          <Action title="Select a Project" style={Action.Style.Destructive} />
        ) : addType === "Nothing" ? (
          <Action title="Select a Type" style={Action.Style.Destructive} />
        ) : search === "" ? (
          <Action title="Enter a Name" style={Action.Style.Destructive} />
        ) : addType === "todo" ? (
          <Action
            title={"Add New Todo"}
            onAction={() => {
              handleAddTodo();
            }}
          />
        ) : addType === "keystone" ? (
          <Action.PickDate
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
        <ClearRefreshAction clearRefresh={clearRefresh} setFirst={setFirstLoad} setShow={setShowDetail} />
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
              title={"Link Todos"}
              onAction={() => {
                setLinkingTodos(!linkingTodos);
              }}
            />
            <Action.PickDate
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
          refresh(["all"]);
        }}
      />
    );
  };

  //#endregion

  const filterTodos = (todos: Todo[], search: string) => {
    const filteredTodos: Todo[] = [];
    todos.forEach((todo) => {
      if (
        todo.name.toLowerCase().includes(search) ||
        todo.project.name.toLowerCase().includes(search) ||
        todo.keystone.date.includes(search) ||
        getDayDateAndMouth(todo.keystone.date).toLowerCase().includes(search) ||
        (todo.checkbox && "done".includes(search)) ||
        (!todo.checkbox && "undone".includes(search))
      )
        filteredTodos.push(todo);
    });
    return filteredTodos;
  };
  const filterKeystones = (keystones: Keystone[], search: string) => {
    const filteredkeystones: Keystone[] = [];
    keystones.forEach((keystone) => {
      if (
        keystone.name.toLowerCase().includes(search) ||
        keystone.project.name.toLowerCase().includes(search) ||
        keystone.date.includes(search) ||
        getDayDateAndMouth(keystone.date).toLowerCase().includes(search)
      )
        filteredkeystones.push(keystone);
    });
    return filteredkeystones;
  };

  return (
    <List
      isShowingDetail={showDetail}
      searchBarPlaceholder={
        addType === "Nothing" ? "Search " + (view === VTEXT.at ? "Todos..." : "Keystones...") : "Enter New " + addType
      }
      searchText={search}
      onSearchTextChange={setSearch}
      onSelectionChange={onSelectionChange}
      searchBarAccessory={isLoading ? <></> : <SearchBarAccessories />}
    >
      {isLoading && firstLoad ? (
        <EmptyView type="Task Manager" />
      ) : (
        <>
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
        </>
      )}
    </List>
  );
};

export default TaskManagementView;
