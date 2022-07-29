import {
  ActionPanel,
  copyTextToClipboard,
  CopyToClipboardAction,
  Detail,
  Icon,
  ImageMask,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { exec } from "child_process";
import { createHash } from "crypto";

export default function UserList() {
  const [status, setStatus] = useState<string>("loading");
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const originalClipboard = await getClipboard();
        await loadTuple();
        setUsers(await getOnlineUsers());
        setStatus("loaded");
        copyTextToClipboard(originalClipboard);
      } catch (e) {
        console.error(e);
        showToast(ToastStyle.Failure, "Unable to connect to Tuple.");
        setStatus("error");
      }
    })();
  }, []);

  if ("error" === status) {
    return <Detail markdown="Unable to connect to Tuple. Please make sure it’s installed and running…" />;
  }

  return (
    <List isLoading={"loaded" !== status} searchBarPlaceholder="Filter users by email...">
      {users.map((user) => (
        <UserListItem key={user.email} user={user} />
      ))}
    </List>
  );
}

function UserListItem(props: { user: User }) {
  const user = props.user;
  return (
    <List.Item
      id={user.email}
      key={user.email}
      title={user.email}
      icon={{ source: user.avatar, mask: ImageMask.Circle }}
      actions={
        <ActionPanel title={user.email}>
          <OpenInBrowserAction
            title="Start Pairing Session"
            url={`tuple://drive?email=${user.email}`}
            icon={Icon.Video}
          />
          <CopyToClipboardAction title="Copy Email Address" content={user.email} />
        </ActionPanel>
      }
    />
  );
}

async function loadTuple(): Promise<boolean> {
  let tries = 0;
  while (tries < 20) {
    if ("tuple-availability: online" === (await tuple("availability-status"))) {
      return true;
    }

    tries++;
    await sleep(100);
  }

  throw new Error("Tuple is not online.");
}

async function getOnlineUsers(): Promise<User[]> {
  const stdout = await tuple("online-users");
  const emails = `${stdout}`.split(",");

  return emails.map((email) => {
    const hash = createHash("md5").update(email).digest("hex");

    const avatar = `https://www.gravatar.com/avatar/${hash}?d=mp`;

    return { email, avatar } as User;
  });
}

function tuple(command: string): Promise<string> {
  return run(`open -g tuple://${command} && pbpaste`);
}

function getClipboard(): Promise<string> {
  return run("pbpaste");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function run(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout) => (error ? reject(error) : resolve(`${stdout}`)));
  });
}

type User = {
  email: string;
  avatar: string;
};
