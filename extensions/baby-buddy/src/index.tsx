import { ActionPanel, Action, List, Icon, Color, Detail, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { BabyBuddyAPI, Child, FeedingEntry, SleepEntry, DiaperEntry } from "./api";
import { formatTimeWithTooltip, getDiaperDescription } from "./utils";
import ChildDetailView from "./components/ChildDetailView";
import CreateFeedingForm from "./components/CreateFeedingForm";
import CreateSleepForm from "./components/CreateSleepForm";
import CreateDiaperForm from "./components/CreateDiaperForm";
import CreateTummyTimeForm from "./components/CreateTummyTimeForm";
import FeedingList from "./components/FeedingList";
import SleepList from "./components/SleepList";
import DiaperList from "./components/DiaperList";
import TummyTimeList from "./components/TummyTimeList";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [children, setChildren] = useState<Child[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchChildren() {
      try {
        const api = new BabyBuddyAPI();
        const childrenData = await api.getChildren();
        setChildren(childrenData);
        setIsLoading(false);
      } catch (e) {
        setError("Failed to fetch children. Please check your Baby Buddy URL and API key.");
        setIsLoading(false);
      }
    }

    fetchChildren();
  }, []);

  if (error) {
    return <Detail markdown={`# Error\n\n${error}`} />;
  }

  return (
    <List isLoading={isLoading}>
      {children.map((child) => (
        <ChildListItem key={child.id} child={child} />
      ))}
    </List>
  );
}

function ChildListItem({ child }: { child: Child }) {
  const [lastFeeding, setLastFeeding] = useState<FeedingEntry | null>(null);
  const [lastSleep, setLastSleep] = useState<SleepEntry | null>(null);
  const [lastDiaper, setLastDiaper] = useState<DiaperEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    async function fetchChildData() {
      try {
        const api = new BabyBuddyAPI();
        const [feedingData, sleepData, diaperData] = await Promise.all([
          api.getLastFeeding(child.id),
          api.getLastSleep(child.id),
          api.getLastDiaper(child.id),
        ]);

        setLastFeeding(feedingData);
        setLastSleep(sleepData);
        setLastDiaper(diaperData);
        setIsLoading(false);
      } catch (e) {
        console.error("Failed to fetch child data:", e);
        setIsLoading(false);
      }
    }

    fetchChildData();
  }, [child.id]);

  const accessories = [];

  if (!isLoading) {
    if (lastFeeding) {
      accessories.push({
        icon: { source: Icon.Mug, tintColor: Color.Blue },
        tooltip: formatTimeWithTooltip(lastFeeding.start).tooltip,
        text: formatTimeWithTooltip(lastFeeding.start).text,
      });
    }

    if (lastSleep) {
      accessories.push({
        icon: { source: Icon.Moon, tintColor: Color.Purple },
        tooltip: formatTimeWithTooltip(lastSleep.end).tooltip,
        text: formatTimeWithTooltip(lastSleep.end).text,
      });
    }

    if (lastDiaper) {
      const diaperType = getDiaperDescription(lastDiaper.wet, lastDiaper.solid);
      accessories.push({
        icon: { source: Icon.Trash, tintColor: Color.Green },
        tooltip: `Last diaper (${diaperType}): ${formatTimeWithTooltip(lastDiaper.time).tooltip}`,
        text: formatTimeWithTooltip(lastDiaper.time).text,
      });
    }
  }

  function handleCreateActivity(activityType: string) {
    // Create a dummy timer with the child's ID
    const endTime = new Date();
    const startTime = new Date(endTime);
    startTime.setSeconds(startTime.getSeconds() - 1); // Set start time 1 second before end time

    const dummyTimer = {
      id: 0,
      name: `New ${activityType}`,
      start: startTime.toISOString(),
      end: endTime.toISOString(),
      active: false,
      user: 0,
      child: child.id,
      duration: "0:00:00",
    };

    const childName = `${child.first_name} ${child.last_name}`;

    // After creating an activity, navigate to the specific activity list
    const onEventCreated = () => {
      // First pop the create form from the navigation stack
      navigation.pop();

      // Then push the appropriate list view
      console.log("Activity type:", activityType);
      switch (activityType) {
        case "Feeding":
          navigation.push(<FeedingList child={child} />);
          break;
        case "Sleep":
          navigation.push(<SleepList child={child} />);
          break;
        case "Diaper Change":
          navigation.push(<DiaperList child={child} />);
          break;
        case "Tummy Time":
          navigation.push(<TummyTimeList child={child} />);
          break;
        default:
          navigation.push(<ChildDetailView child={child} />);
      }
    };

    switch (activityType) {
      case "Feeding":
        return <CreateFeedingForm timer={dummyTimer} childName={childName} onEventCreated={onEventCreated} />;
      case "Sleep":
        return <CreateSleepForm timer={dummyTimer} childName={childName} onEventCreated={onEventCreated} />;
      case "Diaper Change":
        return <CreateDiaperForm timer={dummyTimer} childName={childName} onEventCreated={onEventCreated} />;
      case "Tummy Time":
        return <CreateTummyTimeForm timer={dummyTimer} childName={childName} onEventCreated={onEventCreated} />;
      default:
        return null;
    }
  }

  return (
    <List.Item
      title={`${child.first_name} ${child.last_name}`}
      subtitle={`Born: ${new Date(child.birth_date).toLocaleDateString()}`}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push title="View Child Details" icon={Icon.Eye} target={<ChildDetailView child={child} />} />
          <ActionPanel.Section title="Create New Activity">
            <Action.Push
              title="Create Feeding"
              icon={Icon.Mug}
              target={handleCreateActivity("Feeding")}
              shortcut={{ modifiers: ["cmd"], key: "1" }}
            />
            <Action.Push
              title="Create Sleep"
              icon={Icon.Moon}
              target={handleCreateActivity("Sleep")}
              shortcut={{ modifiers: ["cmd"], key: "2" }}
            />
            <Action.Push
              title="Create Diaper Change"
              icon={Icon.Bubble}
              target={handleCreateActivity("Diaper Change")}
              shortcut={{ modifiers: ["cmd"], key: "3" }}
            />
            <Action.Push
              title="Create Tummy Time"
              icon={Icon.Star}
              target={handleCreateActivity("Tummy Time")}
              shortcut={{ modifiers: ["cmd"], key: "4" }}
            />
          </ActionPanel.Section>
          <Action.CopyToClipboard title="Copy Name" content={`${child.first_name} ${child.last_name}`} />
        </ActionPanel>
      }
    />
  );
}
