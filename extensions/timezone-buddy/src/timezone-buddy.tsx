import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  List,
  useNavigation,
  LocalStorage,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  Image,
} from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";

interface TimezoneBuddy {
  name: string;
  twitter_handle?: string;
  tz: string;
  avatar: string;
}

const ALL_TIMEZONES = (Intl as any).supportedValuesOf("timeZone");

function formatZoneName(zoneName: string): string {
  return zoneName.replaceAll("/", " - ").replaceAll("_", " ");
}

function getCurrentTimeForTz(tz: string): string {
  const formatter = new Intl.DateTimeFormat([], {
    timeZone: tz,
    hour: "numeric",
    minute: "numeric",
  });
  return formatter.format(new Date());
}

function getHourForTz(tz: string): number {
  const formatter = new Intl.DateTimeFormat(["en-GB"], {
    timeZone: tz,
    hour: "numeric",
    hour12: false,
  });

  return Number(formatter.format(new Date()));
}

function CreateBuddyForm(props: { onCreate: (buddy: TimezoneBuddy) => void }): JSX.Element {
  const { pop } = useNavigation();
  const allTimezones = useMemo(() => ALL_TIMEZONES, []);
  const [nameError, setNameError] = useState<string | undefined>();
  const nameRequiredError = "The name field is required";

  function dropNameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }

  function handleSubmit(values: { name: string; twitter_handle: string; timezone: string }): void {
    if (values.name?.length == 0) {
      setNameError(nameRequiredError);
      return;
    }

    props.onCreate({
      name: values.name,
      twitter_handle: values.twitter_handle || "",
      tz: values.timezone,
      avatar: values.twitter_handle
        ? `https://unavatar.io/twitter/${values.twitter_handle}?fallback=https://source.boringavatars.com/beam/${values.twitter_handle}`
        : getAvatarIcon(values.name),
    });
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Buddy" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        error={nameError}
        onChange={dropNameErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setNameError(nameRequiredError);
          } else {
            dropNameErrorIfNeeded();
          }
        }}
      />
      <Form.TextField id="twitter_handle" title="Twitter/X handle" />
      <Form.Dropdown id="timezone" title="Select Timezone">
        {allTimezones &&
          allTimezones.map((tz: string) => <Form.Dropdown.Item value={tz} key={tz} title={formatZoneName(tz)} />)}
      </Form.Dropdown>
    </Form>
  );
}

function CreateBuddyAction(props: { onCreate: (buddy: TimezoneBuddy) => void }) {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Add Buddy"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<CreateBuddyForm onCreate={props.onCreate} />}
    />
  );
}

function DeleteBuddyAction(props: { onDelete: () => void }) {
  return (
    <Action
      icon={Icon.Trash}
      title="Delete Buddy"
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={props.onDelete}
    />
  );
}

function getIconForTz(tz: string) {
  const hour = getHourForTz(tz);
  if ((hour >= 8 && hour < 9) || (hour >= 19 && hour < 23)) {
    return Icon.Warning;
  }

  if (hour >= 23 || hour <= 7) {
    return Icon.Moon;
  }

  return Icon.Emoji;
}

function getColorForTz(tz: string) {
  const hour = getHourForTz(tz);

  if ((hour >= 8 && hour < 9) || (hour >= 19 && hour < 23)) {
    return Color.Yellow;
  }

  if (hour >= 23 || hour <= 7) {
    return Color.Red;
  }

  return Color.Green;
}

function getTooltipForTz(tz: string) {
  const hour = getHourForTz(tz);

  if (hour >= 5 && hour <= 7) {
    return "It's early, they might be sleeping";
  }

  if (hour >= 8 && hour < 9) {
    return "It's early, they might be busy";
  }

  if (hour >= 9 && hour <= 18) {
    return "It's a good time to reach out";
  }

  if (hour >= 19 && hour < 23) {
    return "It's getting late, they might be busy";
  }

  return "It's late, they might be sleeping";
}

export default function Command() {
  const [buddies, setBuddies] = useState<TimezoneBuddy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getBuddies() {
      const buddies = await LocalStorage.getItem<string>("buddies");

      if (buddies) {
        setBuddies(JSON.parse(buddies));
      }

      setLoading(false);
    }

    getBuddies();
  }, []);

  async function handleCreate(buddy: TimezoneBuddy) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Adding buddy...",
    });

    try {
      const newBuddies = [...buddies, buddy];
      setBuddies(newBuddies);
      await LocalStorage.setItem("buddies", JSON.stringify(newBuddies));

      toast.style = Toast.Style.Success;
      toast.title = "Buddy added";
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to add buddy";
      if (err instanceof Error) {
        toast.message = err.message;
      }
    }
  }

  async function handleDelete(index: number) {
    if (
      await confirmAlert({
        title: "Delete this buddy?",
        message: "This action cannot be undone.",
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Deleting buddy...",
      });

      try {
        const newBuddies = [...buddies];
        newBuddies.splice(index, 1);
        setBuddies(newBuddies);
        await LocalStorage.setItem("buddies", JSON.stringify(newBuddies));

        toast.style = Toast.Style.Success;
        toast.title = "Buddy deleted";
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to delete buddy";
        if (err instanceof Error) {
          toast.message = err.message;
        }
      }
    }
  }

  return (
    <List
      isLoading={loading}
      navigationTitle={`Current Time: ${new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "numeric",
      })}`}
      searchBarPlaceholder="Search your buddies..."
      actions={
        <ActionPanel>
          <CreateBuddyAction onCreate={handleCreate} />
        </ActionPanel>
      }
    >
      {buddies &&
        buddies.map((buddy, index) => (
          <List.Item
            key={index}
            title={buddy.name}
            subtitle={formatZoneName(buddy.tz)}
            icon={{ source: buddy.avatar, mask: Image.Mask.Circle }}
            accessories={[
              {
                tag: {
                  value: getCurrentTimeForTz(buddy.tz),
                  color: getColorForTz(buddy.tz),
                },
                tooltip: getTooltipForTz(buddy.tz),
                icon: getIconForTz(buddy.tz),
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <CreateBuddyAction onCreate={handleCreate} />
                  <DeleteBuddyAction onDelete={() => handleDelete(index)} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
