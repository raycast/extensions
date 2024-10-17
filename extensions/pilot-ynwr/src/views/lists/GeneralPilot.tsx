import {
  Action,
  ActionPanel,
  Cache,
  Color,
  confirmAlert,
  getPreferenceValues,
  Icon,
  List,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import React, { useState } from "react";

import { b, br, code, h1, h2 } from "../../tools/markdownTools";
import {
  getDateMounthAndNumber,
  getDayDateAndMouth,
  getHoursAndMin,
  getTimesText,
  progbar,
} from "../../tools/generalTools";
import SubpagesForm from "../forms/SubpagesForm";
import LinksForm from "../forms/LinksForm";
import CalendarView from "./CalendarView";
import TaskManagementView from "./TaskManagementView";
import { Evnt, Keystone, Project, ProjectGP } from "../../interfaces/interfaceItems";
import { QueryStartTimer } from "../../queriesFunctions/TimersQueries";
import JournalView from "./JournalView";
import EndTimerForm from "../forms/EndTimerForm";
import ProjetForm from "../forms/ProjetForm";
import { QueryChangeActiveProject, QueryDeleteProject } from "../../queriesFunctions/ProjectQueries";
import { RefreshAction } from "../actions/actions";
import SelectDBsForm from "../forms/SelectDBsForm";
import UseOAuth from "../../fetch/useOAuth";
import useDBLinkHook from "../../hooks/DBLinkHook";
import useFetchCacheHome from "../../fetch/useFetchCacheHome";
import { Client } from "@notionhq/client";

const cache = new Cache();

interface ProjectItemProps {
  projectGP: object;
  i: number;
}

interface ProjectItemMetadataProps {
  project: Project;
}

const GeneralPilot = () => {
  const { push } = useNavigation();
  const { linked } = useDBLinkHook();
  const nowDate = new Date();

  //#region NOTION HOOKS
  const { notion } = UseOAuth();
  const { isLoading, refresh, allProjects, todayEvents, todayKeystones, gpProjects, activeTimer } = useFetchCacheHome(
    notion as Client,
    linked,
  );

  const [searchText, setSearchText] = useState<string>("");
  const [showDetail, setShowDetail] = useState<boolean>(true);

  //#region ON FUNCTIONS
  const onSelectionChange = (e: string | null) => {
    if (e === null) setShowDetail(false);
    else if (e === "pilot") setShowDetail(true);
    else if (e.includes("project")) setShowDetail(true);
    else setShowDetail(false);
  };
  //#endregion

  //#region HANDLE FUNCTINOS
  const handleChangeActiveProject = async (project: Project) => {
    const bool = !project.active;
    showToast({ title: bool ? "Activating Project..." : "Desactivation Project...", style: Toast.Style.Animated });
    refresh();
    await QueryChangeActiveProject(project.id, bool, notion);
    showToast({ title: "Done !", style: Toast.Style.Success });
  };
  const handleDeleteProject = async (project: Project) => {
    if (
      await confirmAlert({
        title: "Are you sure you want to delete this project ? It will delete all items linked to this project",
      })
    ) {
      showToast({ title: "Deleting Project...", style: Toast.Style.Animated });
      await QueryDeleteProject(project, cache, notion);
      refresh();
      showToast({ title: "Project Deleted !", style: Toast.Style.Success });
    }
  };
  //#endregion

  //#region PILOT ITEM
  const PilotItem = () => {
    return (
      <List.Item
        title={"Welcome @" + getPreferenceValues<{ name: string }>().name}
        icon={"🏡"}
        id="pilot"
        actions={
          <ActionPanel>
            <RefreshAction refresh={refresh} />
          </ActionPanel>
        }
        detail={
          <List.Item.Detail markdown={PilotItemMK(todayKeystones, todayEvents)} metadata={<PilotItemMetadata />} />
        }
      />
    );
  };
  const PilotItemMK = (keystones: Keystone[] | null, events: Evnt[] | null) => {
    let keystoneMK = "";
    if (keystones !== null) {
      keystones.forEach((k) => {
        const done = k.todos.filter((t) => t.checkbox === true).length;
        const todosMK = k.todos.length === 0 ? "" : code("📋 " + progbar(done, k.todos.length, true));
        keystoneMK =
          keystoneMK + b(k.name) + " " + todosMK + " " + code(k.project.icon + " " + k.project.name) + " " + br;
        keystoneMK = keystoneMK + br;
      });
      keystoneMK = keystoneMK + br;
    }
    let eventMK = "";
    if (events !== null) {
      events.forEach((e) => {
        eventMK =
          eventMK +
          b(e.name) +
          " " +
          code("⌚ " + getHoursAndMin(e.start) + " → " + getHoursAndMin(e.end)) +
          " " +
          code(e.project.icon + " " + e.project.name) +
          br;
      });
      eventMK = eventMK + br;
    }
    let nothingMK = "";
    if (keystones === null && events === null) {
      nothingMK = "Nothing to do today 😀";
    }
    return (
      h1("☀️ Today, " + getDayDateAndMouth(nowDate.toISOString())) + br + nothingMK + keystoneMK + br + eventMK + br
    );
  };
  const PilotItemMetadata = () => {
    return (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.TagList title="📁 Project">
          <List.Item.Detail.Metadata.TagList.Item
            text="⊕"
            color={Color.Green}
            onAction={() => push(<ProjetForm refresh={refresh} />)}
          />
          {allProjects.map((project) => {
            return (
              <List.Item.Detail.Metadata.TagList.Item
                key={project.id}
                text={project.name}
                color={project.active ? Color.PrimaryText : Color.SecondaryText}
                onAction={() => handleChangeActiveProject(project)}
                icon={project.icon}
              />
            );
          })}
        </List.Item.Detail.Metadata.TagList>
      </List.Item.Detail.Metadata>
    );
  };
  //#endregion

  //#region PROJECTS SECTION
  const ProjectsSection = () => {
    return (
      <List.Section title="Projects">
        {gpProjects.map((project, i) => {
          return <ProjectItem key={i} projectGP={project} i={i} />;
        })}
      </List.Section>
    );
  };

  const ProjectItem = (props: ProjectItemProps) => {
    const { projectGP, i } = props;

    const project = (projectGP as { project: Project }).project as Project;

    const [open, setOpen] = useState<boolean>(false);
    const onOpen = () => {
      setOpen(!open);
    };

    const accessories = [{ text: "" }];

    return (
      <List.Item
        title={project.name}
        icon={project.icon}
        id={"project " + i.toString()}
        accessories={accessories}
        actions={
          <ActionPanel>
            <Action icon={Icon.Eye} title={!open ? "Show Commands" : "Hide Commands"} onAction={() => onOpen()} />
            <DeleteAction project={project} />
          </ActionPanel>
        }
        detail={
          <List.Item.Detail
            markdown={projectGP === undefined ? code("Refresh") : ProjectItemMK(projectGP)}
            metadata={open ? <ProjectItemMetadata project={project} /> : <></>}
          />
        }
      />
    );
  };
  const ProjectItemMK = (projectGP: object) => {
    const { project, nextKeystone, lastJournal } = projectGP as ProjectGP;

    const { hours, min } = getTimesText(project.times);
    const timeText = project.times === 0 ? "" : code("⏰ You worked " + hours + " hours & " + min + " minutes");
    const nK = nextKeystone;
    const lJ = lastJournal;

    let nKeystoneMK = "";
    if (nK !== null && nK !== undefined) {
      let todosMK = "";
      if (nK.todos.length !== 0) {
        const done = nK.todos.filter((t) => t.checkbox === true).length;
        todosMK = nK.todos.length === 0 ? "" : code("📋 " + progbar(done, nK.todos.length, true));
      }
      nKeystoneMK = h2("📍 Next Keystone : ") + " " + b(nK.name.trim()) + br;
      nKeystoneMK = nKeystoneMK + code("🗓️ " + getDateMounthAndNumber(nK.date)) + br + " " + todosMK + br;
    }

    let lJournalMK = "";
    if (lJ !== null) {
      lJournalMK = h2("📔 " + "Last Journal") + " " + br + code("🗓️ " + getDateMounthAndNumber(lJ.date)) + br;
      if (lJ.text.length !== 1) {
        lJournalMK = lJournalMK + lJ.text + br;
      }
      lJ.todos.forEach(
        (t) => (lJournalMK = lJournalMK + " " + code((t.checkbox ? "🟩" : "🟥" + " ") + " " + t.name) + br),
      );
    }

    return h1(project.icon + " " + project.name) + " " + br + timeText + br + lJournalMK + br + nKeystoneMK + br;
  };
  const ProjectItemMetadata = (props: ProjectItemMetadataProps) => {
    const project = props.project as Project;

    const linksItems = project.links;
    const subsItems = project.subsProject;
    return (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.TagList title="📄 Subspages">
          <List.Item.Detail.Metadata.TagList.Item
            text="⊕"
            color={Color.Green}
            onAction={() => push(<SubpagesForm projects={allProjects} projectID={project.id} refresh={refresh} />)}
          />
          {subsItems.map((subI) => {
            return (
              <List.Item.Detail.Metadata.TagList.Item
                icon={subI.icon}
                text={subI.name}
                key={subI.name}
                onAction={() => {
                  open(subI.url, "Notion");
                }}
              />
            );
          })}
        </List.Item.Detail.Metadata.TagList>
        <List.Item.Detail.Metadata.TagList title="🔗 Links">
          <List.Item.Detail.Metadata.TagList.Item
            text="⊕"
            color={Color.Green}
            onAction={() => push(<LinksForm projects={allProjects} projectID={project.id} refresh={refresh} />)}
          />
          {linksItems?.map((link) => {
            return (
              <List.Item.Detail.Metadata.TagList.Item
                text={link.icon + " " + link.name}
                key={link.id}
                onAction={() => {
                  open(link.url, link.app);
                }}
              />
            );
          })}
        </List.Item.Detail.Metadata.TagList>
      </List.Item.Detail.Metadata>
    );
  };
  //#endregion

  //#region TOOLS SECTION
  const ToolsSection = () => {
    return (
      <List.Section title="Tools">
        <TimerItem />
        <List.Item
          id="calendar"
          title={"🗓️ Open Calendar"}
          actions={
            <ActionPanel>
              <Action.Push icon={"🗓️"} title="Open Your Calendar" target={<CalendarView />} />
            </ActionPanel>
          }
        />
        <List.Item
          id="tm"
          title={"📋 Open Task Manager"}
          actions={
            <ActionPanel>
              <Action.Push
                icon={"📋"}
                title="Open Your Task Manager"
                target={<TaskManagementView launchProps={undefined} />}
              />
            </ActionPanel>
          }
        />
        <List.Item
          id="journal"
          title={"📔 Open Journal"}
          actions={
            <ActionPanel>
              <Action.Push icon={"📔"} title="Open Your Journal" target={<JournalView />} />
            </ActionPanel>
          }
        />
      </List.Section>
    );
  };

  const TimerItem = () => {
    const handleStartTimer = async () => {
      showToast({ title: "Starting timer", style: Toast.Style.Animated });
      const date = new Date().toISOString();
      const r = await QueryStartTimer(date, notion);
      if (!r) showToast({ title: "Error starting timer", style: Toast.Style.Failure });
      else {
        refresh();
        showToast({ title: "Start Timer !", style: Toast.Style.Success });
      }
    };
    const handleStopTimer = () => {
      if (activeTimer === null) return;
      const projects: Project[] = [];
      gpProjects.forEach((p) => projects.push(p.project));
      push(
        <EndTimerForm
          props={{
            timer: activeTimer,
            projects: projects as Project[],
          }}
        />,
      );
    };

    const isRunning = !(activeTimer === null);
    if (isLoading) return <></>;
    return (
      <List.Item
        id="timer"
        title={"⏰ " + (isRunning ? "Stop timer" : "Start timer")}
        subtitle={isRunning ? "started at " + getHoursAndMin(activeTimer.start) : ""}
        actions={
          <ActionPanel>
            {isRunning ? (
              <Action icon={"⏰"} title="Stop Timer" onAction={() => handleStopTimer()} />
            ) : (
              <Action icon={"⏰"} title="Start Timer" onAction={() => handleStartTimer()} />
            )}
          </ActionPanel>
        }
      />
    );
  };
  //#endregion

  const DeleteAction = ({ project }: { project: Project }) => {
    return (
      <Action
        title="Delete"
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["cmd"], key: "x" }}
        onAction={() => handleDeleteProject(project)}
        icon={Icon.Trash}
      />
    );
  };

  //#region HELP SECTIONS
  const HelpSection = () => {
    return (
      <List.Section title="🖐️ Help">
        <List.Item
          title={"Documentation"}
          icon={"📕"}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser icon={"📕"} title="Open Documentation" url="https://pilot-docs.romubuntu.dev/" />
            </ActionPanel>
          }
        />
        <List.Item
          title={"Information & Credits"}
          icon={"ℹ️"}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser icon={"ℹ️"} title="Open Information & Credits" url="https://pilot.romubuntu.dev/" />
            </ActionPanel>
          }
        />
        <List.Item
          title={"Databases Selection"}
          icon={"⚙️"}
          actions={
            <ActionPanel>
              <Action.Push icon={"⚙️"} title="Open Databases Selection" target={<SelectDBsForm notion={notion} />} />
            </ActionPanel>
          }
        />
      </List.Section>
    );
  };
  //#endregion

  //#endregion

  return linked ? (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      onSelectionChange={onSelectionChange}
      filtering={true}
      isShowingDetail={showDetail}
      searchBarPlaceholder="Search Projects, or Views"
      isLoading={isLoading}
    >
      <PilotItem />
      <ProjectsSection />
      <ToolsSection />
      <HelpSection />
    </List>
  ) : (
    <SelectDBsForm notion={notion} />
  );
};
export default GeneralPilot;
