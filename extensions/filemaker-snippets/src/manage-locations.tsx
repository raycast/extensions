import { useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { v4 as uuidv4 } from "uuid";
import { existsSync } from "fs";
import type { Location } from "./utils/types";
import { getDefaultPath, loadSnippets } from "./utils/snippets";
import { getLocationPath, refreshGitLocation, useLocations } from "./utils/use-locations";

type FormValues = Location & { locType: "local" | "git" };

export default function Command() {
  const [locations, setLocations] = useLocations();
  const { pop } = useNavigation();

  function DeleteLocationAction({ id, onDelete }: { id: string; onDelete?: () => void }) {
    return (
      <Action
        style={Action.Style.Destructive}
        title="Remove Snippet Location"
        icon={Icon.Trash}
        shortcut={{ key: "delete", modifiers: ["cmd"] }}
        onAction={async () => {
          if (
            await confirmAlert({
              title: "Are you sure?",
              message: "This will NOT delete the folder or the snippets, just remove the path from your preferences.",
              primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
            })
          ) {
            setLocations((locations) => locations.filter((l) => l.id !== id));
            if (onDelete) onDelete();
          }
        }}
      />
    );
  }

  function EditLocationForm({ location }: { location: Partial<Location> }) {
    const { handleSubmit, itemProps, values, setValidationError } = useForm<FormValues>({
      onSubmit: async (data) => {
        data.id = location.id ?? uuidv4();
        data.git = Boolean(data.locType === "git");
        const toast = await showToast(Toast.Style.Animated, "Saving Snippet Location", "Please wait...");

        if (data.git) {
          // form is not using FilePicker component here, so can trust the path is `string`
          try {
            await refreshGitLocation(data);
          } catch (e) {
            console.error(e);
            const msg = typeof e === "string" ? e : "Unknown error with git";
            setValidationError("path", msg);
            toast.hide();
            return;
          }
        } else {
          // form is using file picker, so path will come in as `string[]`
          data.path = data.path[0];
        }

        locations.findIndex((l) => l.id === data.id) === -1
          ? setLocations((locations) => [...locations, data])
          : setLocations((locations) => locations.map((l) => (l.id === data.id ? data : l)));

        toast.hide();

        pop();
      },
      initialValues: location,
      validation: { path: FormValidation.Required, name: FormValidation.Required },
    });
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Save Snippet Location" onSubmit={handleSubmit} />
            {location.id && <DeleteLocationAction id={location.id} onDelete={pop} />}
          </ActionPanel>
        }
      >
        <Form.TextField {...itemProps.name} title="Name" info="A friendly reference to this folder" />
        <Form.Dropdown {...(itemProps.locType as Form.ItemProps<string>)} title="Location Type">
          <Form.Dropdown.Item value="local" title="My Computer" />
          <Form.Dropdown.Item value="git" title="Git Repository" />
        </Form.Dropdown>
        {values.locType === "local" && (
          <>
            <Form.FilePicker
              id={itemProps.path.id}
              value={itemProps.path.value ? [itemProps.path.value] : []}
              onChange={(val) => itemProps.path.onChange && itemProps.path.onChange(val[0])}
              error={itemProps.path.error}
              allowMultipleSelection={false}
              canChooseDirectories
              canChooseFiles={false}
              title="Folder"
            />
            <Form.Description
              title="WARNING"
              text="The enitre contents of this folder will be scanned for snippets. Select a folder that will only contain snippets for better performance."
            />
          </>
        )}
        {values.locType === "git" && (
          <>
            <Form.TextField {...itemProps.path} title="Git URL" info="The URL of the git repository" />
            <Form.Description text="Any snippets found in this git repository will be available to you" />
            <Form.Description text="The Git URL must be publically accessible or contain credentials in the URL." />
          </>
        )}
      </Form>
    );
  }

  function AddLocationAction() {
    return (
      <Action.Push
        title="Add Location"
        shortcut={{ key: "n", modifiers: ["cmd"] }}
        icon={Icon.NewFolder}
        target={<EditLocationForm location={{}} />}
      />
    );
  }

  function RevealInFinderAction({ path }: { path: Location["path"] }) {
    return <Action.ShowInFinder title="Reveal in Finder" icon={Icon.Finder} path={path} />;
  }

  return (
    <List
      actions={
        <ActionPanel>
          <AddLocationAction />
        </ActionPanel>
      }
    >
      <List.Section>
        <List.Item
          title="My Computer"
          subtitle="default, cannot be changed"
          icon={Icon.StarCircle}
          accessories={[countSnippets()]}
          actions={
            <ActionPanel>
              <RevealInFinderAction path={getDefaultPath()} />
              <AddLocationAction />
            </ActionPanel>
          }
        />

        {locations.map((location) => {
          return (
            <List.Item
              title={location.name}
              icon={location.git ? Icon.Compass : Icon.Folder}
              subtitle={location.path}
              accessories={[countSnippets(location)]}
              actions={
                <ActionPanel>
                  <RevealInFinderAction path={getLocationPath(location)} />
                  <Action.Push
                    title="Edit"
                    icon={Icon.Pencil}
                    target={<EditLocationForm location={location} />}
                    shortcut={{ key: "e", modifiers: ["cmd"] }}
                  />
                  <DeleteLocationAction id={location.id} />
                  <AddLocationAction />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      <List.Section title="———">
        <List.Item
          title="Add Location"
          icon={Icon.NewFolder}
          actions={
            <ActionPanel>
              <AddLocationAction />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function countSnippets(location?: Location): List.Item.Accessory {
  const path = getLocationPath(location);
  const folderExists = existsSync(path);
  if (!folderExists) {
    return { icon: Icon.Warning, text: "Not Found" };
  }

  const count = loadSnippets(location).length;
  return { text: `${count}`, icon: Icon.CheckCircle };
}
