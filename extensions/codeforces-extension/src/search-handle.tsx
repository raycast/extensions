/* eslint-disable @typescript-eslint/no-explicit-any */
import { Action, ActionPanel, Detail, Form, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { useFetch } from "@raycast/utils";
import { getColorHexCode } from "./func/HexCode";
import { UserData, initialUserData } from "./interface/UserData";
import { CODEFORCES_API_BASE, CODEFORCES_BASE } from "./constants";
import { UserSubmissions } from "./components/UserSubmissions";
import { Contest } from "./components/Contest";

export default function Command() {
  const [name, setName] = useState<string>("");
  return (
    <Form
      navigationTitle="Seach Codeforces Handle"
      actions={
        <ActionPanel title="Codeforces Handle">
          <Action.Push title="Search Handle" icon={{ source: Icon.MagnifyingGlass }} target={<User value={name} />} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" value={name} onChange={setName} title="Enter Handle" />
    </Form>
  );
}

function unString(str: string) {
  return str || "Not Found";
}

function User(name: { value: any; }) {
  const userHandle = name.value;
  const { isLoading, data, error } = useFetch(`${CODEFORCES_API_BASE}user.info?handles=${userHandle}`, {
    keepPreviousData: true,
  });
  const [formattedString, setFormattedString] = useState("Fetching Results...");
  const [userData, setUserData] = useState<UserData>(initialUserData);

  if (error) {
    console.log(`Error while fetching details: \n ${error}`);
  }

  useEffect(() => {
    if (!isLoading) {
      setUserData((data as any).result[0]);
    }
  }, [isLoading]);

  useEffect(() => {
    setFormattedString(
      `# ${userData.handle} ${userData.firstName || userData.lastName ? "-" : ""} ${userData.firstName || ""} ${
        userData.lastName || ""
      }\n\n![Title Photo](${unString(userData.titlePhoto)})`,
    );
  }, [userData]);

  function convertToTitleCase(str: string) {
    if (!str) return "";
    return str.toLowerCase().replace(/\b\w/g, (s: string) => s.toUpperCase());
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Codeforces Handle Details"
      markdown={formattedString}
      actions={
        <ActionPanel title="Codeforces Handle">
          <Action.Push
            title="Contest Histroy"
            icon={{ source: Icon.AppWindowList }}
            target={<Contest value={name} />}
          />
          <Action.Push
            title="User Submissions"
            shortcut={{ modifiers: ["shift"], key: "enter" }}
            icon={{ source: Icon.AppWindowList }}
            target={<UserSubmissions value={{ name, comp: "status" }} />}
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
              text={convertToTitleCase(`${(userData.maxRating)}`)}
              color={getColorHexCode((userData.maxRating))}
            />
            <Detail.Metadata.TagList.Item
              text={convertToTitleCase(`${unString(userData.maxRank)}`)}
              color={getColorHexCode((userData.maxRating))}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Current Rank">
            <Detail.Metadata.TagList.Item
              text={convertToTitleCase(`${(userData.rating)}`)}
              color={getColorHexCode((userData.rating))}
            />
            <Detail.Metadata.TagList.Item
              text={convertToTitleCase(`${unString(userData.rank)}`)}
              color={getColorHexCode((userData.rating))}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Friend of" text={`${unString(userData.friendOfCount)}`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Organisation" text={`${unString(userData.organization)}`} />
          <Detail.Metadata.Label
            title="Last Online"
            text={`${new Date(userData.lastOnlineTimeSeconds * 1000).toLocaleString("en-US", {
              weekday: "short",
            })} ${new Date(userData.lastOnlineTimeSeconds * 1000).toLocaleDateString()} ${new Date(
              userData.lastOnlineTimeSeconds * 1000,
            ).toLocaleTimeString()}`}
          />
          <Detail.Metadata.Label
            title="Registered On"
            text={`${new Date(userData.registrationTimeSeconds * 1000).toLocaleString("en-US", {
              weekday: "short",
            })} ${new Date(userData.registrationTimeSeconds * 1000).toLocaleDateString()} ${new Date(
              userData.registrationTimeSeconds * 1000,
            ).toLocaleTimeString()}`}
          />
        </Detail.Metadata>
      }
    />
  );
}
