import { ActionPanel, List, Action, showToast, Toast, showHUD, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { useExec } from "@raycast/utils";
import { userInfo } from "os";
import { exec } from "child_process";
import { Preferences } from "./utils";
import CreatePassForm from "./createPasswordForm";

export interface passwords_path_structure {
  pass_file_path: string;
  pass_file_name: string;
}

interface password_metadata {
  name: string;
  value: string;
}

type password_meta = password_metadata[];

const preferences = getPreferenceValues<Preferences>();
let options: any = {
  env: { PATH: preferences.path_var },
  ...process.env,
  ...userInfo(),
};
const DeletePassword = async (props: passwords_path_structure) => {
  const cmd = exec(`pass rm -f '${props.pass_file_name}'`, options);
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Decrypting file",
  });

  cmd.stdout!.on("data", async (data) => {
    toast.style = Toast.Style.Success;
    toast.title = data;
    await showHUD("Password deleted");
  });

  cmd.on("close", (code) => {
    if (code != 0) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to delete password";
    }
  });
};

const CopyPassword = async (props: passwords_path_structure) => {
  const cmd = exec(`pass -c '${props.pass_file_name}'`, options);
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Decrypting file",
  });

  cmd.stdout!.on("data", async (data) => {
    toast.style = Toast.Style.Success;
    toast.title = data;
    await showHUD(data);
  });

  cmd.on("close", (code) => {
    if (code != 0) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to copy password";
    }
  });
};

const CopyOTP = async (props: passwords_path_structure) => {
  const cmd = exec(`pass otp '${props.pass_file_name}' | pbcopy && echo "Copied OTP code"`, options);
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Decrypting file",
  });

  cmd.stdout!.on("data", async (data) => {
    toast.style = Toast.Style.Success;
    toast.title = data;
    await showHUD(data);
  });

  cmd.on("close", (code) => {
    if (code != 0) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to copy OTP";
    }
  });
};

function PasswordMetadata(props: passwords_path_structure) {
  const ParseMetadata = (raw_data: string) => {
    return raw_data.split("\n").map((val) => {
      const indx = val.indexOf(":");
      const field_name = val.slice(0, indx);
      const field_value = val.slice(indx).substring(1);
      return { name: field_name, value: field_value };
    });
  };

  const loadPasswordDetails = () => {
    const [markdown, setMarkdown] = useState<password_meta>([]);
    options = {
      ...options,
      onData: (data: string) => {
        setMarkdown(ParseMetadata(data));
      },
    };

    const { isLoading } = useExec("pass", ["tail", `'${props.pass_file_name}'`], options);
    return (
      <List isLoading={isLoading}>
        {markdown.map((val, i) => {
          return (
            <List.Item
              key={i}
              title={val.name}
              accessories={[{ text: val.value }]}
              actions={
                <ActionPanel title={val.name}>
                  <Action.CopyToClipboard title={`Copy value of '${val.name}'`} content={val.value} />
                  <Action
                    title={"Copy Password"}
                    onAction={() => CopyPassword(props)}
                    shortcut={{ modifiers: ["ctrl"], key: "c" }}
                  />
                  <Action
                    title={"Copy OTP"}
                    onAction={() => CopyOTP(props)}
                    shortcut={{ modifiers: ["ctrl"], key: "o" }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List>
    );
  };
  return loadPasswordDetails();
}

export default function GetPasswordDetails(props: passwords_path_structure) {
  return (
    <ActionPanel>
      <Action.Push
        title={"Browse metadata"}
        target={<PasswordMetadata pass_file_path={props.pass_file_path} pass_file_name={props.pass_file_name} />}
        shortcut={{ modifiers: ["cmd"], key: "o" }}
      />
      <Action
        title={"Copy Password"}
        onAction={() => CopyPassword(props)}
        shortcut={{ modifiers: ["ctrl"], key: "c" }}
      />
      <Action title={"Copy OTP"} onAction={() => CopyOTP(props)} shortcut={{ modifiers: ["ctrl"], key: "o" }} />
      <Action.Push
        shortcut={{ modifiers: ["ctrl"], key: "a" }}
        title={"Create Pass Entry"}
        target={<CreatePassForm />}
      />
      <Action
        shortcut={{ modifiers: ["ctrl"], key: "d" }}
        onAction={() => DeletePassword(props)}
        title={"Delete Pass Entry"}
      />
    </ActionPanel>
  );
}
