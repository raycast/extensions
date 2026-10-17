import { Action, ActionPanel, Detail, Icon, LaunchProps } from "@raycast/api";
import { useEffect, useState } from "react";
import { getColorHexCode } from "./func/HexCode";
import { useCodeforces } from "./func/useCodeforces";
import type { User } from "./types/codeforces";
import { initialUserData } from "./types/codeforces";
import { CODEFORCES_BASE } from "./constants";
import { UserSubmissions } from "./components/UserSubmissions";
import { Contest } from "./components/Contest";

export default function Command(props: LaunchProps<{ arguments: Arguments.SearchHandle }>) {
  return <User value={props.arguments.handle} />;
}

function unString(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return "Not Found";
  return String(value);
}

function User(name: { value: string }) {
  const userHandle = name.value;

  // typed hook: returns ApiResponse.result as `User[]` in `result`
  const { isLoading, result } = useCodeforces<User[]>("user.info", { handles: userHandle });

  const [formattedString, setFormattedString] = useState("Fetching Results...");
  const [userData, setUserData] = useState<User>(initialUserData);

  useEffect(() => {
    const first = result && result.length > 0 ? result[0] : undefined;
    if (first) {
      setUserData(first);
    }
  }, [result]);

  useEffect(() => {
    const handle = userData?.handle ?? "";
    const first = userData?.firstName ?? "";
    const last = userData?.lastName ?? "";
    const sep = first || last ? " - " : "";
    setFormattedString(`# ${handle}${sep}${first} ${last}\n\n![Title Photo](${unString(userData?.titlePhoto)})`);
  }, [userData]);

  function convertToTitleCase(str?: string | number | null) {
    if (str === undefined || str === null) return "";
    const s = String(str);
    if (!s) return "";
    return s.toLowerCase().replace(/\b\w/g, (sChar: string) => sChar.toUpperCase());
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Codeforces Handle Details"
      markdown={formattedString}
      actions={
        <ActionPanel title="Codeforces Handle">
          <Action.Push
            title="Contest History"
            icon={{ source: Icon.AppWindowList }}
            target={<Contest name={name.value} />}
          />
          <Action.Push
            title="User Submissions"
            shortcut={{ modifiers: ["shift"], key: "enter" }}
            icon={{ source: Icon.AppWindowList }}
            target={<UserSubmissions name={name.value} comp={"status"} />}
          />
          <Action.OpenInBrowser
            shortcut={{ modifiers: ["ctrl"], key: "enter" }}
            url={`${CODEFORCES_BASE}profile/${userHandle}`}
          />
          <Action.CopyToClipboard
            shortcut={{ modifiers: ["opt"], key: "enter" }}
            title="Copy Profile URL"
            content={`${CODEFORCES_BASE}profile/${userHandle}`}
          />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Max Rating">
            <Detail.Metadata.TagList.Item
              text={convertToTitleCase(`${userData.maxRating ?? 0}`)}
              color={getColorHexCode(userData.maxRating ?? 0)}
            />
            <Detail.Metadata.TagList.Item
              text={convertToTitleCase(`${unString(userData.maxRank)}`)}
              color={getColorHexCode(userData.maxRating ?? 0)}
            />
          </Detail.Metadata.TagList>

          <Detail.Metadata.TagList title="Current Rank">
            <Detail.Metadata.TagList.Item
              text={convertToTitleCase(`${userData.rating ?? 0}`)}
              color={getColorHexCode(userData.rating ?? 0)}
            />
            <Detail.Metadata.TagList.Item
              text={convertToTitleCase(`${unString(userData.rank)}`)}
              color={getColorHexCode(userData.rating ?? 0)}
            />
          </Detail.Metadata.TagList>

          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Friend of" text={`${unString(userData.friendOfCount)}`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Organisation" text={`${unString(userData.organization)}`} />
          <Detail.Metadata.Label
            title="Last Online"
            text={`${new Date((userData.lastOnlineTimeSeconds ?? 0) * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ${new Date((userData.lastOnlineTimeSeconds ?? 0) * 1000).toLocaleDateString([], { weekday: "short", year: "numeric", month: "short", day: "numeric" })}`}
          />
          <Detail.Metadata.Label
            title="Registered On"
            text={`${new Date((userData.registrationTimeSeconds ?? 0) * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ${new Date((userData.registrationTimeSeconds ?? 0) * 1000).toLocaleDateString([], { weekday: "short", year: "numeric", month: "short", day: "numeric" })}`}
          />
        </Detail.Metadata>
      }
    />
  );
}
