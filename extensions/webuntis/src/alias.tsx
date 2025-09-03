/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-var */

import {
  Detail,
  List,
  LocalStorage,
  Icon,
  ActionPanel,
  Action,
  openExtensionPreferences,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { WebUntis, WebUntisElementType } from "webuntis";

export default function Command(props: { arguments: { shortcut: string } }) {
  const { shortcut } = props.arguments;

  const [aliases, setAliases] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [timetableView, setTimetableView] = useState<any>(null);
  const [timetableMarkdown, setTimetableMarkdown] = useState<string | null>(null);

  const addLocalTeachers = async (teachers: any[]) => {
    // Aktuelle Lehrer aus dem LocalStorage laden
    const currentLocalStorageTeachers: any[] = JSON.parse((await LocalStorage.getItem("teachers")) || "[]");

    // Map für schnelles Deduplizieren
    const teacherMap = new Map(currentLocalStorageTeachers.map((t) => [t.id, t]));

    for (const teacher of teachers) {
      console.log(teacher.element.name);
      const newTeacher = {
        id: teacher.element.id,
        name: teacher.element.name,
      };

      if (!teacherMap.has(newTeacher.id)) {
        console.log("Adding new teacher:", newTeacher);
        teacherMap.set(newTeacher.id, newTeacher);
      } else {
        console.log("Teacher already exists:", newTeacher);
      }
    }

    // Alles wieder zurückschreiben
    const newLocalTeachers = Array.from(teacherMap.values());
    await LocalStorage.setItem("teachers", JSON.stringify(newLocalTeachers));
  };

  function formatLesson(entry: any) {
    const subjects = entry.subjects
      ?.map((s: any) => s.element.name)
      .filter(Boolean)
      .join(", ");
    const classes = entry.classes
      ?.map((c: any) => c.element.name)
      .filter(Boolean)
      .join(", ");

    const teachers = entry.teachers
      ?.map((t: any) => t.element.name)
      .filter(Boolean)
      .join(", ");
    const rooms = entry.rooms
      ?.map((r: any) => r.element.name)
      .filter(Boolean)
      .join(", ");

    let text = [
      subjects || "—",
      classes ? `(${classes})` : "",
      teachers ? `- ${teachers}` : "",
      rooms ? `@ ${rooms}` : "",
    ]
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    // Handle canceled lessons
    if (entry.cellState === "CANCEL" || entry.is?.cancelled) {
      text = `~~${text}~~`;
    }

    return text;
  }

  function getWeekday(date: number) {
    const str = date.toString();
    const year = parseInt(str.substring(0, 4));
    const month = parseInt(str.substring(4, 6)) - 1;
    const day = parseInt(str.substring(6, 8));
    const weekday = new Date(year, month, day).getDay();
    return weekday === 0 ? 6 : weekday - 1; // 0=MO ... 4=FR
  }

  const fetchAlias = async () => {
    const preferences = getPreferenceValues<Preferences>();
    if (Object.keys(preferences).length > 0) {
      const { username, password, school, server } = preferences;
      const untis = new WebUntis(school, username, password, server);
      console.log(await untis.login());
      var _aliases: any = [];

      const currentSchoolyear = await untis.getCurrentSchoolyear();

      try {
        const allClasses = await untis.getClasses(true, currentSchoolyear.id);
        allClasses.forEach((classItem: any) => {
          if (
            classItem.name.toLowerCase().includes(shortcut.toLowerCase()) ||
            classItem.id.toString() === shortcut ||
            classItem.longName.toLowerCase().includes(shortcut.toLowerCase())
          ) {
            _aliases.push({
              id: classItem.id,
              type: "class",
              name: classItem.name,
              longName: classItem.longName,
            });
          }
        });
      } catch (error) {
        console.error(error);
      }

      try {
        const allSubjects = await untis.getSubjects(true);
        allSubjects.forEach((subjectItem: any) => {
          if (
            subjectItem.name.toLowerCase().includes(shortcut.toLowerCase()) ||
            subjectItem.id.toString() === shortcut ||
            subjectItem.longName.toLowerCase().includes(shortcut.toLowerCase())
          ) {
            _aliases.push({
              id: subjectItem.id,
              type: "subject",
              name: subjectItem.alternateName
                ? subjectItem.name + " (" + subjectItem.alternateName + ")"
                : subjectItem.name,
              longName: subjectItem.longName,
            });
          }
        });
      } catch (error) {
        console.error(error);
      }

      try {
        const allRooms = await untis.getRooms(true);
        allRooms.forEach((roomItem: any) => {
          if (
            roomItem.name.toLowerCase().includes(shortcut.toLowerCase()) ||
            roomItem.id.toString() === shortcut ||
            roomItem.longName.toLowerCase().includes(shortcut.toLowerCase())
          ) {
            _aliases.push({
              id: roomItem.id,
              type: "room",
              name: roomItem.name,
              longName: roomItem.longName,
            });
          }
        });
      } catch (error) {
        console.error(error);
      }

      try {
        const allTeachers = await untis.getTeachers(true);
        allTeachers.forEach((teacherItem: any) => {
          if (
            teacherItem.name.toLowerCase().includes(shortcut.toLowerCase()) ||
            teacherItem.id.toString() === shortcut ||
            teacherItem.longName.toLowerCase().includes(shortcut.toLowerCase())
          ) {
            _aliases.push({
              id: teacherItem.id,
              type: "teacher",
              name: teacherItem.name,
              longName: teacherItem.longName,
            });
          }
        });
      } catch (error) {
        const localTeachers = JSON.parse((await LocalStorage.getItem("teachers")) || "[]");
        console.log(localTeachers);
        localTeachers.forEach((teacherItem: any) => {
          if (
            teacherItem.name.toLowerCase().includes(shortcut.toLowerCase()) ||
            teacherItem.id.toString() === shortcut
          ) {
            _aliases.push({
              id: teacherItem.id,
              type: "teacher",
              name: teacherItem.name,
              longName: "",
            });
          }
        });
      }

      setAliases(_aliases);
    } else {
      setError(true);
      setErrorDetails("No credentials found");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAlias();
  }, []);

  const getTimetableForTeacher = async (teacherId: any) => {
    setTimetableView(true);

    const preferences = getPreferenceValues<Preferences>();
    if (Object.keys(preferences).length > 0) {
      const { username, password, school, server } = preferences;
      const untis = new WebUntis(school, username, password, server);
      await untis.login();

      const timetable = await untis.getTimetableForWeek(new Date(), teacherId, WebUntisElementType.TEACHER, 1);

      console.log(timetable, teacherId);

      const timegrid = await untis.getTimegrid(true);
      const timeunits = timegrid[0].timeUnits;

      // pro Wochentag ein Array von Arrays (je Zeit-Slot eine Liste von Einträgen)
      const grid: string[][][] = [[], [], [], [], []]; // MO–FR

      // Grid vorbereiten: für jede Zeitstunde einen leeren Slot anlegen
      for (let d = 0; d < 5; d++) {
        for (let i = 0; i < timeunits.length; i++) {
          grid[d][i] = [];
        }
      }

      // Einträge einfügen
      timetable.forEach((entry: any) => {
        const weekday = getWeekday(entry.date);
        if (weekday < 5) {
          // den Slot finden: index im timegrid anhand der lessonNumber oder startTime
          const slotIndex = timeunits.findIndex(
            (tu: any) => tu.startTime === entry.startTime && tu.endTime === entry.endTime,
          );
          if (slotIndex >= 0) {
            grid[weekday][slotIndex].push(formatLesson(entry));
          }
        }
      });

      let markdown = `| Uhrzeit | MO | DI | MI | DO | FR |\n|---------|----|----|----|----|----|\n`;

      for (let i = 0; i < timeunits.length; i++) {
        const start = timeunits[i].startTime;
        const end = timeunits[i].endTime;

        const startFormatted = `${String(Math.floor(start / 100)).padStart(2, "0")}:${String(start % 100).padStart(
          2,
          "0",
        )}`;
        const endFormatted = `${String(Math.floor(end / 100)).padStart(2, "0")}:${String(end % 100).padStart(2, "0")}`;

        function formatCell(entries: string[]) {
          if (!entries.length) return "";
          return entries.map((e) => `${e}`).join("\t\t\t\t\t\t\t\t\t"); // jede Stunde in neuer Zeile mit Bulletpoint
        }

        markdown += `| ${timeunits[i].name}. (${startFormatted} - ${endFormatted}) | ${formatCell(grid[0][i])} | ${formatCell(grid[1][i])} | ${formatCell(grid[2][i])} | ${formatCell(grid[3][i])} | ${formatCell(grid[4][i])} |\n`;
      }

      setTimetableMarkdown(markdown);
    }
  };

  const getTimetableForClass = async (classId: any) => {
    setTimetableView(true);

    const preferences = getPreferenceValues<Preferences>();
    if (Object.keys(preferences).length > 0) {
      const { username, password, school, server } = preferences;
      const untis = new WebUntis(school, username, password, server);
      await untis.login();

      const timetable = await untis.getTimetableForWeek(new Date(), classId, 1);
      const timegrid = await untis.getTimegrid(true);
      const timeunits = timegrid[0].timeUnits;

      const allTeachers: any[] = [];
      timetable.forEach((entry: any) => {
        if (entry.teachers) {
          allTeachers.push(...entry.teachers);
        }
      });
      await addLocalTeachers(allTeachers); // nur einmal speichern

      // pro Wochentag ein Array von Arrays (je Zeit-Slot eine Liste von Einträgen)
      const grid: string[][][] = [[], [], [], [], []]; // MO–FR

      // Grid vorbereiten: für jede Zeitstunde einen leeren Slot anlegen
      for (let d = 0; d < 5; d++) {
        for (let i = 0; i < timeunits.length; i++) {
          grid[d][i] = [];
        }
      }

      // Einträge einfügen
      timetable.forEach((entry: any) => {
        const weekday = getWeekday(entry.date);
        if (weekday < 5) {
          // den Slot finden: index im timegrid anhand der lessonNumber oder startTime
          const slotIndex = timeunits.findIndex(
            (tu: any) => tu.startTime === entry.startTime && tu.endTime === entry.endTime,
          );
          if (slotIndex >= 0) {
            grid[weekday][slotIndex].push(formatLesson(entry));
          }
        }
      });

      let markdown = `| Uhrzeit | MO | DI | MI | DO | FR |\n|---------|----|----|----|----|----|\n`;

      for (let i = 0; i < timeunits.length; i++) {
        const start = timeunits[i].startTime;
        const end = timeunits[i].endTime;

        const startFormatted = `${String(Math.floor(start / 100)).padStart(2, "0")}:${String(start % 100).padStart(
          2,
          "0",
        )}`;
        const endFormatted = `${String(Math.floor(end / 100)).padStart(2, "0")}:${String(end % 100).padStart(2, "0")}`;

        function formatCell(entries: string[]) {
          if (!entries.length) return "";
          return entries.map((e) => `${e}`).join("\t\t\t\t\t\t\t\t\t"); // jede Stunde in neuer Zeile mit Bulletpoint
        }

        markdown += `| ${timeunits[i].name}. (${startFormatted} - ${endFormatted}) | ${formatCell(grid[0][i])} | ${formatCell(grid[1][i])} | ${formatCell(grid[2][i])} | ${formatCell(grid[3][i])} | ${formatCell(grid[4][i])} |\n`;
      }

      setTimetableMarkdown(markdown);
    }
  };

  if (loading) {
    return <Detail isLoading={true}></Detail>;
  }

  if (error) {
    return <Detail isLoading={false} navigationTitle="Error" markdown={errorDetails}></Detail>;
  }

  if (timetableView) {
    return (
      <Detail
        navigationTitle="Timetable"
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            <Action
              title="Back"
              shortcut={{ key: "escape", modifiers: ["shift"] }}
              onAction={() => {
                setTimetableView(false);
              }}
            />
          </ActionPanel>
        }
        markdown={timetableMarkdown}
      ></Detail>
    );
  }

  return (
    <List
      searchBarPlaceholder="Kürzel, Name, ID..."
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
      searchText={shortcut}
      navigationTitle={`Alias für: ${shortcut}`}
    >
      {aliases && aliases.length > 0 ? (
        aliases.map((alias: any) => {
          if (alias.type === "class") {
            return (
              <List.Item
                icon={Icon.TwoPeople}
                key={alias.id}
                title={`${alias.name}`}
                subtitle={`${alias.longName}`}
                actions={
                  <ActionPanel>
                    <Action title="Show Timetable" onAction={() => getTimetableForClass(alias.id)} />
                  </ActionPanel>
                }
              />
            );
          }

          if (alias.type === "subject") {
            return <List.Item icon={Icon.Book} key={alias.id} title={`${alias.name}`} subtitle={`${alias.longName}`} />;
          }

          if (alias.type === "room") {
            return <List.Item icon={Icon.Box} key={alias.id} title={`${alias.name}`} subtitle={`${alias.longName}`} />;
          }

          if (alias.type === "teacher") {
            return (
              <List.Item
                icon={Icon.Person}
                key={alias.id}
                title={`${alias.name}`}
                subtitle={`${alias.longName}`}
                actions={
                  <ActionPanel>
                    <Action title="Show Timetable" onAction={() => getTimetableForTeacher(alias.id)} />
                  </ActionPanel>
                }
              />
            );
          }
        })
      ) : (
        <List.Item title="No aliases found" />
      )}
    </List>
  );
}
