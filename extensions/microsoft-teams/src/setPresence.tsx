import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { Availability, getAvailability, setAvailability } from "./api/presence";
import { usePromise } from "@raycast/utils";

interface Presence {
  label: string;
  availability?: Availability;
  icon: Image;
}

const presences: Presence[] = [
  { label: "Available", availability: "Available", icon: { source: Icon.CheckCircle, tintColor: Color.Green } },
  { label: "Busy", availability: "Busy", icon: { source: Icon.CircleFilled, tintColor: Color.Red } },
  {
    label: "Do not disturb",
    availability: "DoNotDisturb",
    icon: { source: Icon.MinusCircleFilled, tintColor: Color.Red },
  },
  { label: "Be right back", availability: "BeRightBack", icon: { source: Icon.Pause, tintColor: Color.Yellow } },
  { label: "Away", availability: "Away", icon: { source: Icon.Clock, tintColor: Color.Yellow } },
  { label: "Offline", availability: "Offline", icon: { source: Icon.XMarkCircle } },
  { label: "Clear Presence", icon: { source: Icon.Undo } },
];

function PresenceItem({ presence, isCurrent, onSet }: { presence: Presence; isCurrent: boolean; onSet: () => void }) {
  const onAction = async () => {
    await setAvailability(presence.availability);
    onSet();
  };
  return (
    <List.Item
      title={presence.label}
      icon={presence.icon}
      accessories={isCurrent ? [{ tag: "Active", icon: Icon.Check }] : undefined}
      actions={
        <ActionPanel>
          <Action title={"Set Presence"} onAction={onAction} />
        </ActionPanel>
      }
    />
  );
}

export default function SetPresence() {
  const { isLoading, data: currentAvailability, revalidate } = usePromise(getAvailability);
  return (
    <List isLoading={isLoading}>
      {presences.map((presence) => (
        <PresenceItem
          key={presence.label}
          presence={presence}
          isCurrent={currentAvailability !== undefined && presence.availability === currentAvailability}
          onSet={revalidate}
        />
      ))}
    </List>
  );
}
