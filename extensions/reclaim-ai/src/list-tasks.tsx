import { List } from "@raycast/api";
import { useTask } from "./hooks/useTask";
import { Task } from "./types/task";
import { useEffect, useMemo, useState } from "react";

const TaskList = () => {
  // const { data } = useTask().getAllTasks();
  // const tasks = data;
  
  const { getAllTasks } = useTask();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true);
        const tasks = await getAllTasks();
        setTasks(tasks);
      } catch (error) {
        console.error("Error loading tasks", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [getAllTasks]);

  return (
    <List
    isLoading={isLoading}
    >
      {tasks?.map((task: Task) => (
        <List.Item key={task.id} title={task.title} subtitle={task.status} />
      ))}
    </List>
  );
};

export default function Command() {
  return (
    <TaskList />
  );
}

// import { List } from "@raycast/api";
// import { useTask } from "./hooks/useTask";
// import { Task } from "./types/task";

// const ListOfTasks = () => {
//   const { data } = useTask();
//   const tasks = data?.data;

//   return (
//     <List>
//       {tasks?.map((task: Task) => (
//         <List.Item key={task.id} title={task.title} />
//       ))}
//     </List>
//   );
// }

// export default function Command() {
//   return (
//     // <ListOfTasks />
//     <List>
//       <List.Item title="Augustiner Helles" subtitle="0,5 Liter" accessories={[{ text: "Germany" }]} />
//     </List>
//   );
// }

// import { List } from "@raycast/api";
// import { useTask } from "./hooks/useTask";
// import { Task } from "./types/task";
// import { TaskActions } from "./hooks/useTask.types";

// import { useEvent } from "./hooks/useEvent";
// import { EventActions } from "./hooks/useEvent.types";
// import { Event } from "./types/event";
// // import { eventColors } from "./utils/events";
// import { useEffect, useMemo, useState } from "react";

// import {
//   addDays,
//   differenceInHours,
//   endOfDay,
//   formatDistance,
//   isAfter,
//   isBefore,
//   isWithinInterval,
//   startOfDay,
// } from "date-fns";

// const TaskList = () => {
//   const { data } = useTask();
//   const tasks = data?.data;

//   console.log(tasks)
//   return (
//     <List>
//       {tasks?.map((task: Task) => (
//         <List.Item key={task.id} title={task.title} />
//       ))}
//     </List>
//   );
// };
// console.log(TaskList)

// export default function Command() {
//   const [isLoading, setIsLoading] = useState(false);
//   const [eventsData, setEventsData] = useState<Event[]>([]);
//   const { fetchEvents } = useEvent();

//   useEffect(() => {
//     const loadEvents = async () => {
//       try {
//         setIsLoading(true);
//         const events = await fetchEvents({
//           start: startOfDay(new Date()),
//           end: addDays(new Date(), 7),
//         });
//         setEventsData(events || []);
//       } catch (error) {
//         console.error("Error loading events", error);
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     void loadEvents();
//   }, []);

//   return (
//     <TaskList />
//   );
// }

// import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
// import {
//   addDays,
//   differenceInHours,
//   endOfDay,
//   formatDistance,
//   isAfter,
//   isBefore,
//   isWithinInterval,
//   startOfDay,
// } from "date-fns";
// import { useEffect, useMemo, useState } from "react";
// import { useEvent } from "./hooks/useEvent";
// import { EventActions } from "./hooks/useEvent.types";
// import { Event } from "./types/event";
// import { eventColors } from "./utils/events";

// const EventActionsList = ({ event }: { event: Event }) => {
//   const [eventActions, setEventActions] = useState<EventActions>([]);

//   const { getEventActions } = useEvent();

//   const loadEventActions = async () => {
//     const actions = await getEventActions(event);
//     setEventActions(actions);
//   };

//   useEffect(() => {
//     void loadEventActions();
//   }, []);

//   return (
//     <ActionPanel>
//       {eventActions.map((action) => (
//         <Action
//           key={action.title}
//           title={action.title}
//           icon={action.icon}
//           onAction={() => {
//             action.action();
//           }}
//         />
//       ))}
//     </ActionPanel>
//   );
// };

// const now = new Date();

// const ListSection = ({ events, sectionTitle }: { sectionTitle: string; events: Event[] }) => {
//   const { showFormattedEventTitle } = useEvent();

//   return (
//     <List.Section title={sectionTitle}>
//       {events.map((item) => (
//         <List.Item
//           key={item.eventId}
//           title={showFormattedEventTitle(item)}
//           icon={{
//             tintColor: eventColors[item.color],
//             source: Icon.Dot,
//           }}
//           accessories={[
//             {
//               text: formatDistance(new Date(item.eventStart), now, {
//                 addSuffix: true,
//               }).replace("about", ""),
//             },
//             { tag: { value: item.free ? "free" : "busy", color: Color.Blue } },
//           ]}
//           actions={<EventActionsList event={item} />}
//         />
//       ))}
//     </List.Section>
//   );
// };

// export default function Command() {
//   const [searchText, setSearchText] = useState("");
//   const [eventsData, setEventsData] = useState<Event[]>([]);
//   const [isLoading, setIsLoading] = useState(false);

//   const { fetchEvents } = useEvent();

//   const events = useMemo<EventSection[]>(() => {
//     if (!eventsData) return [];

//     const now = new Date();
//     const today = startOfDay(now);
//     const tomorrow = startOfDay(addDays(now, 1));

//     const events: EventSection[] = [
//       {
//         section: "NOW",
//         sectionTitle: "Now",
//         events: eventsData
//           .filter((event) => {
//             const start = new Date(event.eventStart);
//             const end = new Date(event.eventEnd);
//             return isWithinInterval(now, { start, end });
//           })
//           .filter((event) => {
//             return !(differenceInHours(new Date(event.eventEnd), new Date(event.eventStart)) >= 24);
//           }),
//       },
//       {
//         section: "TODAY",
//         sectionTitle: "Today",
//         events: eventsData
//           .filter((event) => {
//             const start = new Date(event.eventStart);
//             return isAfter(start, now) && isBefore(start, endOfDay(now));
//           })
//           .filter((event) => {
//             return !(differenceInHours(new Date(event.eventEnd), new Date(event.eventStart)) >= 24);
//           }),
//       },
//       {
//         section: "EARLIER_TODAY",
//         sectionTitle: "Earlier today",
//         events: eventsData
//           .filter((event) => {
//             const end = new Date(event.eventEnd);
//             const start = new Date(event.eventStart);
//             return isAfter(start, today) && isBefore(end, now);
//           })
//           .filter((event) => {
//             return !(differenceInHours(new Date(event.eventEnd), new Date(event.eventStart)) >= 24);
//           }),
//       },
//       {
//         section: "TOMORROW",
//         sectionTitle: "Tomorrow",
//         events: eventsData
//           .filter((event) => {
//             const start = new Date(event.eventStart);
//             return isWithinInterval(start, { start: tomorrow, end: endOfDay(tomorrow) });
//           })
//           .filter((event) => {
//             return !(differenceInHours(new Date(event.eventEnd), new Date(event.eventStart)) >= 24);
//           }),
//       },
//     ];

//     return events.filter((event) => event.events.length > 0);
//   }, [eventsData]);

//   useEffect(() => {
//     const loadEvents = async () => {
//       try {
//         setIsLoading(true);
//         const events = await fetchEvents({
//           start: startOfDay(new Date()),
//           end: addDays(new Date(), 7),
//         });
//         setEventsData(events || []);
//       } catch (error) {
//         console.error("Error loading events", error);
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     void loadEvents();
//   }, []);

//   return (
//     <List
//       filtering={true}
//       isLoading={isLoading}
//       searchText={searchText}
//       onSearchTextChange={setSearchText}
//       navigationTitle="My Calendar"
//       searchBarPlaceholder="Search your events"
//     >
//       {events.map((section) => (
//         <ListSection key={section.section} sectionTitle={section.sectionTitle} events={section.events} />
//       ))}
//     </List>
//   );
// }
