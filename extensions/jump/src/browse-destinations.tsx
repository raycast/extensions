import {
  LocalStorage,
  List,
  ActionPanel,
  Action,
  Icon,
  launchCommand,
  LaunchType,
  useNavigation,
  Form,
  Image,
  confirmAlert,
  Alert,
  closeMainWindow,
} from "@raycast/api";
import { installDefaultWeights } from "./defaults";
import { useEffect, useState } from "react";
import { getFavicon } from "@raycast/utils";
import { LocalStorageValue } from "./types";

const EditDestinationForm = (props: {
  destination: string;
  weight: number;
  onSubmit: (destination: string, weight: number) => void;
}) => {
  // Modify or create a jump destination
  const { destination, weight, onSubmit } = props;

  const [urlPathError, setUrlPathError] = useState<string | undefined>();
  const [weightError, setWeightError] = useState<string | undefined>();

  const checkUrlPathField = (value: string | undefined) => {
    // Validate the destination address field
    if (value == undefined || value.trim() == "") {
      setUrlPathError("Address cannot be empty");
    } else {
      if (!value.includes("/") && !value.includes(":")) {
        setUrlPathError("Address must be a valid URL or POSIX path");
      } else if (value.includes(":") && value.includes(" ")) {
        setUrlPathError("Invalid URL");
      } else {
        setUrlPathError(undefined);
      }
    }
  };

  const checkWeightField = (value: string | undefined) => {
    // Validate the destination weight field
    if (value == undefined || value.trim() == "") {
      setWeightError("Weight cannot be empty");
    } else {
      const valueNum = parseFloat(value);
      if (isNaN(valueNum)) {
        setWeightError("Weight must be a number");
      } else if (valueNum < 0) {
        setWeightError("Weight must be non-negative");
      } else {
        setWeightError(undefined);
      }
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={async (values: { urlPathField: string; weightField: string }) => {
              const newWeight = parseFloat(values.weightField);
              await LocalStorage.removeItem(destination);
              await LocalStorage.setItem(values.urlPathField, newWeight);
              onSubmit(values.urlPathField, newWeight);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="urlPathField"
        title="Full URL or Path"
        placeholder="Enter the full destination address"
        defaultValue={destination}
        error={urlPathError}
        onChange={(value) => checkUrlPathField(value)}
        onBlur={(event) => checkUrlPathField(event.target.value)}
      />

      <Form.TextField
        id="weightField"
        title="Weight"
        placeholder="Enter the weight to use in matching calculations"
        defaultValue={`${weight}`}
        error={weightError}
        onChange={(value) => checkWeightField(value)}
        onBlur={(event) => checkWeightField(event.target.value)}
      />
    </Form>
  );
};

export default function Main() {
  const [destinations, setDestinations] = useState<LocalStorageValue>({});
  const { push, pop } = useNavigation();

  // Install initial data if first time running
  useEffect(() => {
    const initInitial = async () => {
      let allItems = await LocalStorage.allItems<LocalStorageValue>();
      if (Object.keys(allItems).length == 0) {
        console.log("Installing default weights");
        await installDefaultWeights();
        allItems = await LocalStorage.allItems<LocalStorageValue>();
      }
      setDestinations(allItems);
    };
    initInitial();
  }, []);

  const listItems = Object.entries(destinations).map(([target, weight]) => {
    let itemIcon: Image.ImageLike | Icon | { fileIcon: string } = Icon.Link;
    if (target.startsWith("/")) {
      itemIcon = { fileIcon: target };
    } else if (target.match(/^[A-Za-z-._~:/?#[\]@!$&'()*+,;=]+$/)) {
      try {
        itemIcon = getFavicon(target, { fallback: Icon.Link });
      } catch (error) {
        console.log(error);
      }
    }

    // Round weight to 5 decimal places and remove trailing zeros
    const weightStr = Number.isNaN(weight) ? "" : parseFloat(weight.toFixed(5));

    return (
      <List.Item
        title={target}
        subtitle={`Weight: ${weightStr}`}
        key={target}
        icon={itemIcon}
        actions={
          <ActionPanel>
            <ActionPanel.Section title="This Destination">
              <Action
                title="Jump"
                icon={Icon.ArrowRightCircle}
                shortcut={{ modifiers: ["cmd"], key: "j" }}
                onAction={async () => {
                  await closeMainWindow();
                  await launchCommand({
                    name: "jump",
                    type: LaunchType.Background,
                    arguments: { destination: target },
                  });
                }}
              />

              <Action
                title="Edit Destination"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                onAction={() =>
                  push(
                    <EditDestinationForm
                      destination={target}
                      weight={weight}
                      onSubmit={async () => {
                        setDestinations(await LocalStorage.allItems());
                        pop();
                      }}
                    />,
                  )
                }
              />

              <Action
                title="Delete Destination"
                icon={Icon.Trash}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                style={Action.Style.Destructive}
                onAction={async () => {
                  const options: Alert.Options = {
                    title: "Delete Destination",
                    message: "Are you sure?",
                    primaryAction: {
                      title: "Delete",
                      style: Alert.ActionStyle.Destructive,
                    },
                  };
                  if (await confirmAlert(options)) {
                    await LocalStorage.removeItem(target);
                    setDestinations(await LocalStorage.allItems());
                  }
                }}
              />
            </ActionPanel.Section>

            <ActionPanel.Section title="General">
              <Action
                title="New Destination"
                icon={Icon.PlusCircle}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={() =>
                  push(
                    <EditDestinationForm
                      destination=""
                      weight={1}
                      onSubmit={async () => {
                        setDestinations(await LocalStorage.allItems());
                        pop();
                      }}
                    />,
                  )
                }
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  });

  return <List isLoading={!listItems.length}>{listItems}</List>;
}
