import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  List,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useCachedState, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { State } from "./state";
import { Envelope, Flag, Folder } from "./models";
import * as Envelopes from "./envelopes";
import * as Folders from "./folders";
import * as Exec from "./exec";
import "reflect-metadata";
import { Type, serialize, deserializeArray } from "class-transformer";

export default function ListEnvelopes() {
  const [state, setState] = useCachedState<State>("index", {
    isLoading: true,
    envelopes: [],
    folders: [],
    exe: false,
  } as State);

  useEffect(() => {
    async function fetch() {
      const rawEnvelopes = await LocalStorage.getItem<string>("envelopes");

      if (rawEnvelopes != undefined) {
        console.debug("Found envelopes in cache");

        await LocalStorage.removeItem("envelopes");

        const envelopes: Envelope[] = deserializeArray(Envelope, rawEnvelopes);

        setState((previous: State) => ({
          ...previous,
          envelopes: envelopes,
        }));
      }

      const rawFolders = await LocalStorage.getItem<string>("folders");

      if (rawFolders != undefined) {
        console.debug("Found folders in cache");

        await LocalStorage.removeItem("folders");

        const folders: Folder[] = deserializeArray(Folder, rawFolders);

        setState((previous: State) => ({
          ...previous,
          folders: folders,
        }));
      }
    }

    fetch();
  }, []);

  useEffect(() => {
    async function fetch() {
      setState((previous: State) => ({
        ...previous,
        isLoading: true,
      }));

      const exe = await hasExe();

      if (exe) {
        const envelopes = await Envelopes.list();
        const folders = await Folders.list();

        setState((previous: State) => ({
          ...previous,
          envelopes: envelopes,
          folders: folders,
          isLoading: false,
          exe: exe,
        }));
      } else {
        setState((previous: State) => ({
          ...previous,
          envelopes: [],
          folders: [],
          isLoading: false,
          exe: exe,
        }));
      }
    }

    fetch();
  }, []);

  if (state.exe || state.isLoading) {
    return <List isLoading={state.isLoading}>{envelopesToList(state, setState)}</List>;
  } else {
    return <Detail markdown="Couldn't find executable, please install Himalaya CLI" />;
  }
}

const group_envelopes_by_date = (envelopes: Envelope[]) => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
  const today = now.toISOString().substring(0, 10);

  const groups = envelopes.reduce((acc, val) => {
    const date = val.date.toISOString().substring(0, 10);

    const date_distance = (() => {
      switch (date) {
        case today:
          return "Today";
        case yesterday:
          return "Yesterday";
        default:
          return date;
      }
    })();

    const envelopes: Envelope[] | undefined = acc.get(date_distance);

    if (envelopes) {
      // Get and update_distance the list
      envelopes.push(val);
      acc.set(date_distance, envelopes);
    } else {
      acc.set(date_distance, [val]);
    }

    return acc;
  }, new Map<string, Envelope[]>());

  return groups;
};

async function hasExe(): Promise<boolean> {
  try {
    const { stdout, stderr } = await Exec.run("which himalaya", {
      env: {
        PATH: Exec.PATH,
      },
    });

    if (stdout) {
      return true;
    } else if (stderr) {
      console.error("Couldn't find executable", stderr);

      return false;
    } else {
      throw new Error("No results from stdout or stderr");
    }
  } catch (error) {
    console.error("Couldn't find executable", error);

    return false;
  }
}

interface MoveToSelectedFormValues {
  folder: string;
}

function MoveToSelectedForm(props: { folders: Folder[]; envelope: Envelope; setState: any }) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<MoveToSelectedFormValues>({
    async onSubmit(values) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Moving envelope to folder ${values.folder}`,
      });

      try {
        const { stdout, stderr } = await Exec.run(`"himalaya" move ${values.folder} -- ${props.envelope.id}`, {
          env: {
            PATH: Exec.PATH,
          },
        });
        if (stdout) {
          toast.style = Toast.Style.Success;
          toast.title = `Moved envelope to folder ${values.folder}`;

          props.setState((previous: State) => ({
            ...previous,
            isLoading: true,
          }));
          const envelopes = await Envelopes.list();

          props.setState((previous: State) => ({
            ...previous,
            envelopes: envelopes,
            isLoading: false,
          }));

          pop();
        } else if (stderr) {
          console.error(stderr);

          toast.style = Toast.Style.Failure;
          toast.title = `Failed to move envelope`;

          pop();
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = `Failed to move envelope: ${error}`;

        pop();
      }
    },
    initialValues: {
      folder: props.folders[0].name,
    },
    validation: {
      folder: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Folder" {...itemProps.folder}>
        {props.folders.map((folder) => {
          return <Form.Dropdown.Item value={folder.name} title={folder.name} key={folder.name} />;
        })}
      </Form.Dropdown>
    </Form>
  );
}

function ReadDetail(props: { envelope: Envelope }) {
  const [state, setState] = useState<{ isLoading: boolean; email: null | string }>({
    isLoading: true,
    email: null,
  });

  useEffect(() => {
    async function fetch() {
      setState((previous) => ({
        ...previous,
        isLoading: true,
      }));

      const email = await readEmail(props.envelope);

      setState((previous) => ({
        ...previous,
        isLoading: false,
        email: email,
      }));
    }

    fetch();
  }, []);

  const markdown = state.email;

  return (
    <Detail
      isLoading={state.isLoading}
      navigationTitle={props.envelope.subject}
      markdown={markdown}
      actions={
        <ActionPanel title="Envelope">
          <Action.CopyToClipboard title="Copy ID to Clipboard" content={props.envelope.id} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={props.envelope.from.name} />
          <Detail.Metadata.Label title="Email" text={props.envelope.from.addr} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Date" text={props.envelope.date.toISOString()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Flags">
            {props.envelope.flags.map((flag) => (
              <Detail.Metadata.TagList.Item text={flag} key={flag} />
            ))}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
    />
  );
}

async function readEmail(envelope: Envelope): Promise<string> {
  const { stdout, stderr } = await Exec.run(`"himalaya" read --mime-type plain ${envelope.id}`, {
    env: {
      PATH: Exec.PATH,
    },
  });

  if (stdout) {
    return stdout;
  } else if (stderr) {
    console.log(stderr);

    return stderr;
  } else {
    throw new Error("No results from stdout or stderr");
  }
}

const markUnreadAction = (envelope: Envelope, state: State, setState: any) => {
  return (
    <Action
      title="Mark Unread"
      style={Action.Style.Regular}
      icon={Icon.CircleFilled}
      onAction={async () => {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "Marking as unread",
        });

        try {
          const { stdout, stderr } = await Exec.run(`"himalaya" flag remove ${envelope.id} -- seen`, {
            env: {
              PATH: Exec.PATH,
            },
          });

          if (stdout) {
            toast.style = Toast.Style.Success;
            toast.title = "Marked unread";

            setState((previous: State) => ({ ...previous, isLoading: true }));
            const envelopes = await Envelopes.list();

            setState((previous: State) => ({
              ...previous,
              envelopes: envelopes,
              isLoading: false,
            }));
          } else if (stderr) {
            console.error(stderr);

            setState((previous: State) => ({ ...previous, isLoading: false }));

            toast.style = Toast.Style.Failure;
            toast.title = "Failed to mark unread";
          } else {
            throw new Error("No results from stdout or stderr");
          }
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = `Failed to mark unread: ${error}`;
        }
      }}
    />
  );
};

const markReadAction = (envelope: Envelope, state: State, setState: any) => {
  return (
    <Action
      title="Mark Read"
      style={Action.Style.Regular}
      icon={Icon.Circle}
      onAction={async () => {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "Marking as read",
        });

        try {
          const { stdout, stderr } = await Exec.run(`"himalaya" flag add ${envelope.id} -- seen`, {
            env: {
              PATH: Exec.PATH,
            },
          });

          if (stdout) {
            toast.style = Toast.Style.Success;
            toast.title = "Marked read";

            setState((previous: State) => ({ ...previous, isLoading: true }));
            const envelopes = await Envelopes.list();

            setState((previous: State) => ({
              ...previous,
              envelopes: envelopes,
              isLoading: false,
            }));
          } else if (stderr) {
            console.error(stderr);

            setState((previous: State) => ({ ...previous, isLoading: false }));

            toast.style = Toast.Style.Failure;
            toast.title = "Failed to mark read";
          } else {
            throw new Error("No results from stdout or stderr");
          }
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = `Failed to mark read: ${error}`;
        }
      }}
    />
  );
};

const moveToSelectedAction = (envelope: Envelope, state: State, setState: any) => {
  return (
    <Action.Push
      title="Move to Selected"
      icon={Icon.Folder}
      target={<MoveToSelectedForm folders={state.folders} envelope={envelope} setState={setState} />}
    />
  );
};

const readAction = (envelope: Envelope) => {
  return <Action.Push title="Read" icon={Icon.Eye} target={<ReadDetail envelope={envelope} />} />;
};

const moveToTrashAction = (envelope: Envelope, state: State, setState: any) => {
  return (
    <Action
      title="Move to Trash"
      style={Action.Style.Destructive}
      icon={Icon.Trash}
      onAction={async () => {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "Moving to trash",
        });

        try {
          const { stdout, stderr } = await Exec.run(`"himalaya" delete ${envelope.id}`, {
            env: {
              PATH: Exec.PATH,
            },
          });

          if (stdout) {
            toast.style = Toast.Style.Success;
            toast.title = "Moved to trash";

            setState((previous: State) => ({ ...previous, isLoading: true }));
            const envelopes = await Envelopes.list();

            setState((previous: State) => ({
              ...previous,
              envelopes: envelopes,
              isLoading: false,
            }));
          } else if (stderr) {
            console.error(stderr);

            setState((previous: State) => ({ ...previous, isLoading: false }));

            toast.style = Toast.Style.Failure;
            toast.title = "Failed to move to trash";
          } else {
            throw new Error("No results from stdout or stderr");
          }
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = `Failed to move to trash: ${error}`;
        }
      }}
    />
  );
};

const accessories = (envelope: Envelope) => {
  const accessories = [];

  if (envelope.flags.includes(Flag.Answered)) {
    accessories.push({
      icon: Icon.Reply,
    });
  }

  // This is always present. Accessories are rendered ordered
  // so put them last.
  accessories.push({
    text: {
      value: `${envelope.from.name} <${envelope.from.addr}>`,
    },
    icon: Icon.Person,
  });

  return accessories;
};

const envelopesToList = (state: State, setState: any): any => {
  return Array.from(group_envelopes_by_date(state.envelopes).entries()).map(([date, group]) => {
    const items = group.map((envelope) => {
      const item = (
        <List.Item
          id={envelope.id}
          key={envelope.id}
          title={envelope.subject}
          icon={envelope.flags.includes(Flag.Seen) ? Icon.Circle : Icon.CircleFilled}
          accessories={accessories(envelope)}
          actions={
            <ActionPanel title="Envelope">
              {readAction(envelope)}
              {envelope.flags.includes(Flag.Seen) && markUnreadAction(envelope, state, setState)}
              {!envelope.flags.includes(Flag.Seen) && markReadAction(envelope, state, setState)}
              {moveToSelectedAction(envelope, state, setState)}
              {moveToTrashAction(envelope, state, setState)}
              <Action.CopyToClipboard title="Copy ID to Clipboard" content={envelope.id} />
            </ActionPanel>
          }
        />
      );

      return item;
    });

    const section = (
      <List.Section title={date} key={date}>
        {items}
      </List.Section>
    );

    return section;
  });
};
