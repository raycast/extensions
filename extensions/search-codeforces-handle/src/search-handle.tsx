/* eslint-disable @typescript-eslint/no-explicit-any */
import { Action, ActionPanel, Color, Detail, Form, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { useFetch } from "@raycast/utils";

const CODEFORCES_API_BASE = "https://codeforces.com/api/";
const CODEFORCES_BASE = "https://codeforces.com/";

export default function Command() {
  const [name, setName] = useState<string>("");
  return (
    <Form
      navigationTitle="Seach Codeforces Handle"
      actions={
        <ActionPanel title="Search Codeforces Handle">
          <Action.Push title="Search Handle" icon={{ source: Icon.MagnifyingGlass }} target={<User value={name} />} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" value={name} onChange={setName} title="Enter Handle" />
    </Form>
  );
}

function getColorHexCode(value) {
  const ranges = [
    { min: 0, max: 1199, color: "#CCCCCC" },
    { min: 1200, max: 1399, color: "#9BFC87" },
    { min: 1400, max: 1599, color: "#90DBBD" },
    { min: 1600, max: 1899, color: "#AAAAF9" },
    { min: 1900, max: 2099, color: "#EF8EF9" },
    { min: 2100, max: 2299, color: "#F7CE91" },
    { min: 2300, max: 2399, color: "#F5BE67" },
    { min: 2400, max: 2599, color: "#EE7F7B" },
    { min: 2600, max: 2999, color: "#EB483F" },
  ];

  const range = ranges.find(({ min, max }) => value >= min && value <= max);
  return range ? range.color : "#9C1F14";
}

function User(name) {
  interface UserData {
    firstName?: string;
    lastName?: string;
    handle?: string;
    maxRating?: string;
    maxRank?: string;
    rating?: string;
    rank?: string;
    friendOfCount?: string;
    organization?: string;
    lastOnlineTimeSeconds?: number;
    registrationTimeSeconds?: number;
    titlePhoto?: string;
  }

  const initialUserData: UserData = {
    firstName: "",
    lastName: "",
    handle: "",
    maxRating: "",
    maxRank: "",
    rating: "",
    rank: "",
    friendOfCount: "",
    organization: "",
    lastOnlineTimeSeconds: 0,
    registrationTimeSeconds: 0,
    titlePhoto: "https://userpic.codeforces.org/no-title.jpg",
  };

  const userHandle = name.value;
  const { isLoading, data, error } = useFetch(`${CODEFORCES_API_BASE}user.info?handles=${userHandle}`, {
    keepPreviousData: true,
  });
  const [formattedString, setFormattedString] = useState("Fetching Result...");
  const [userData, setUserData] = useState<UserData>(initialUserData);

  if (error) {
    console.log(`Error while fetching details: \n ${error}`);
  }

  useEffect(() => {
    if (!isLoading) {
      setUserData((data as any).result[0]);
    }
  }, [isLoading]);

  const {
    firstName = "",
    lastName = "",
    handle = "",
    maxRating = "",
    maxRank = "",
    rating = "",
    rank = "",
    friendOfCount: friends = "",
    organization: org = "",
    lastOnlineTimeSeconds: lastOnline = 0,
    registrationTimeSeconds: regTime = 0,
    titlePhoto: dp = "https://userpic.codeforces.org/no-title.jpg",
  } = userData;

  useEffect(() => {
    setFormattedString(`# ${handle} - ${firstName} ${lastName}\n\n![](${dp})`);
  }, [userData]);

  function convertToTitleCase(str) {
    if (!str) return "";
    return str.toLowerCase().replace(/\b\w/g, (s) => s.toUpperCase());
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Handle Details"
      markdown={formattedString}
      actions={
        <ActionPanel title="Codeforces Handle">
          <Action.OpenInBrowser url={`${CODEFORCES_BASE}profile/${userHandle}`} />
          <Action.CopyToClipboard title="Copy Profile URL" content={`${CODEFORCES_BASE}profile/${userHandle}`} />
          <Action.Push
            title="Contest Histroy"
            shortcut={{ modifiers: ["shift"], key: "enter" }}
            icon={{ source: Icon.AppWindowList }}
            target={<Contest value={name} />}
          />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Max Rating">
            <Detail.Metadata.TagList.Item
              text={convertToTitleCase(`${maxRating}`)}
              color={getColorHexCode(maxRating)}
            />
            <Detail.Metadata.TagList.Item text={convertToTitleCase(`${maxRank}`)} color={getColorHexCode(maxRating)} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Current Rank">
            <Detail.Metadata.TagList.Item text={convertToTitleCase(`${rating}`)} color={getColorHexCode(rating)} />
            <Detail.Metadata.TagList.Item text={convertToTitleCase(`${rank}`)} color={getColorHexCode(rating)} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Friend of" text={`${friends}`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Organisation" text={`${org}`} />
          <Detail.Metadata.Label
            title="Last Online"
            text={`${new Date(lastOnline * 1000).toLocaleString("en-US", { weekday: "short" })} ${new Date(
              lastOnline * 1000,
            ).toLocaleDateString()} ${new Date(lastOnline * 1000).toLocaleTimeString()}`}
          />
          <Detail.Metadata.Label
            title="Registered On"
            text={`${new Date(regTime * 1000).toLocaleString("en-US", { weekday: "short" })} ${new Date(
              regTime * 1000,
            ).toLocaleDateString()} ${new Date(regTime * 1000).toLocaleTimeString()}`}
          />
        </Detail.Metadata>
      }
    />
  );
}

function Contest(name) {
  const userHandle = name.value.value;
  const { isLoading, data, error } = useFetch(`${CODEFORCES_API_BASE}user.rating?handle=${userHandle}`, {
    keepPreviousData: true,
  });

  if (error) {
    console.log(`Error while fetching constests: \n ${error}`);
  }

  useEffect(() => {
    if (!isLoading) {
      setItems((data as any).result);
      filterList((data as any).result);
    }
  }, [isLoading]);

  const [items, setItems] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [filteredList, filterList] = useState([]);

  useEffect(() => {
    filterList(items.filter((item) => item.contestName.includes(searchText)));
  }, [searchText]);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Contest"
      searchBarPlaceholder="Search Contest"
      isShowingDetail
    >
      {filteredList.reverse().map((item) => (
        <List.Item
          key={item.contestId}
          title={item.contestName}
          actions={
            <ActionPanel title="Participated Contests">
              <Action.Push title="Get Submissions Details" target={<Submissions id={item.contestId} handle={userHandle} />} />
              <Action.OpenInBrowser url={`${CODEFORCES_BASE}contest/${item.contestId}`} />
            </ActionPanel>
          }
          subtitle={`${item.contestId}`}
          detail={
            <List.Item.Detail
              markdown={`# ${item.contestName}`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Rank" text={`${item.rank}`} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.TagList title="Old Rating">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={`${item.oldRating}`}
                      color={getColorHexCode(item.oldRating)}
                    />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.TagList title="New Rating">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={`${item.newRating}`}
                      color={getColorHexCode(item.newRating)}
                    />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.TagList title="Delta">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={`${item.newRating - item.oldRating > 0 ? "+" : "-"}${Math.abs(
                        item.newRating - item.oldRating,
                      )}`}
                      color={item.newRating - item.oldRating >= 0 ? Color.Green : Color.Red}
                    />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Rating Last Updated"
                    text={`${new Date(item.ratingUpdateTimeSeconds * 1000).toLocaleString("en-US", {
                      weekday: "short",
                    })} ${new Date(item.ratingUpdateTimeSeconds * 1000).toLocaleDateString()} ${new Date(
                      item.ratingUpdateTimeSeconds * 1000,
                    ).toLocaleTimeString()}`}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}

function Submissions(values) {
  interface Problem {
    contestId: number;
    index: string;
    name: string;
    type: string;
    points: number;
    rating: number;
    tags: string[];
  }

  interface Author {
    contestId: number;
    members: { handle: string }[];
    participantType: string;
    ghost: boolean;
    room: number;
    startTimeSeconds: number;
  }

  interface Result {
    id?: number;
    contestId?: number;
    creationTimeSeconds?: number;
    relativeTimeSeconds?: number;
    problem?: Problem;
    author?: Author;
    programmingLanguage?: string;
    verdict?: string;
    testset?: string;
    passedTestCount?: number;
    timeConsumedMillis?: number;
    memoryConsumedBytes?: number;
  }

  const emptyResult: Result = {
    id: 0,
    contestId: 0,
    creationTimeSeconds: 0,
    relativeTimeSeconds: 0,
    problem: {
      contestId: 0,
      index: "",
      name: "",
      type: "",
      points: 0.0,
      rating: 0,
      tags: [],
    },
    author: {
      contestId: 0,
      members: [{ handle: "" }],
      participantType: "",
      ghost: false,
      room: 0,
      startTimeSeconds: 0,
    },
    programmingLanguage: "",
    verdict: "",
    testset: "",
    passedTestCount: 0,
    timeConsumedMillis: 0,
    memoryConsumedBytes: 0,
  };

  const results: Result[] = [emptyResult];

  const { isLoading, data, error } = useFetch(
    `${CODEFORCES_API_BASE}contest.status?contestId=${values.id}&handle=${values.handle}`,
    {
      keepPreviousData: true,
    },
  );
  const [conData, setConData] = useState<Result[]>(results);

  if (error) {
    console.log(`Error while fetching details: \n ${error}`);
  }

  useEffect(() => {
    if (!isLoading) {
      setConData((data as any).result);
    }
  }, [isLoading]);

  function getExecutionStatusString(status) {
    switch (status) {
      case 'FAILED':
        return 'Failed';
      case 'OK':
        return 'Correct';
      case 'PARTIAL':
        return 'Partial Success';
      case 'COMPILATION_ERROR':
        return 'Compilation Error';
      case 'RUNTIME_ERROR':
        return 'Runtime Error';
      case 'WRONG_ANSWER':
        return 'Wrong Answer';
      case 'PRESENTATION_ERROR':
        return 'Presentation Error';
      case 'TIME_LIMIT_EXCEEDED':
        return 'Time Limit Exceeded';
      case 'MEMORY_LIMIT_EXCEEDED':
        return 'Memory Limit Exceeded';
      case 'IDLENESS_LIMIT_EXCEEDED':
        return 'Idleness Limit Exceeded';
      case 'SECURITY_VIOLATED':
        return 'Security Violated';
      case 'CRASHED':
        return 'Crashed';
      case 'INPUT_PREPARATION_CRASHED':
        return 'Input Preparation Crashed';
      case 'CHALLENGED':
        return 'Challenged';
      case 'SKIPPED':
        return 'Skipped';
      case 'TESTING':
        return 'Testing';
      case 'REJECTED':
        return 'Rejected';
      default:
        return 'Unknown Status';
    }
  }
  
  function getExecutionStatusColor(status) {
    switch (status) {
      case 'FAILED':
        return Color.Red;
      case 'OK':
        return Color.Green;
      case 'PARTIAL':
        return Color.Yellow;
      case 'COMPILATION_ERROR':
        return Color.Red;
      case 'RUNTIME_ERROR':
        return Color.Red;
      case 'WRONG_ANSWER':
        return Color.Red;
      case 'PRESENTATION_ERROR':
        return Color.Yellow;
      case 'TIME_LIMIT_EXCEEDED':
        return Color.Red;
      case 'MEMORY_LIMIT_EXCEEDED':
        return Color.Orange;
      case 'IDLENESS_LIMIT_EXCEEDED':
        return Color.Orange;
      case 'SECURITY_VIOLATED':
        return Color.Red;
      case 'CRASHED':
        return Color.Red;
      case 'INPUT_PREPARATION_CRASHED':
        return Color.Orange;
      case 'CHALLENGED':
        return Color.Blue;
      case 'SKIPPED':
        return Color.Yellow;
      case 'TESTING':
        return Color.Magenta;
      case 'REJECTED':
        return Color.Red;
      default:
        return Color.PrimaryText;
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle="Search Submissions" searchBarPlaceholder="Search Submissions">
      {conData.reverse().map((item) => (
        <List.Item
          key={item.id}
          title={`${item.problem.index}. ${item.problem.name}`}
          actions={
            <ActionPanel title="Submissions">
              <Action.OpenInBrowser
                title="Open Submission in Browser"
                url={`${CODEFORCES_BASE}contest/${item.contestId}/submission/${item.id}`}
              />
              <Action.OpenInBrowser
                title="Open Problem in Browser"
                url={`${CODEFORCES_BASE}contest/${item.contestId}/problem/${item.problem.index}`}
              />
              <Action.CopyToClipboard
                title="Copy Problem URL"
                content={`${CODEFORCES_BASE}contest/${item.contestId}/problem/${item.problem.index}`}
              />
            </ActionPanel>
          }
          accessories={[
            { text: `${item.problem.rating}`, icon: Icon.BarChart },
            { text: `${item.programmingLanguage}` },
            { date: new Date(item.creationTimeSeconds * 1000) },
            { tag: { value: getExecutionStatusString(item.verdict), color: getExecutionStatusColor(item.verdict) } },
          ]}
        />
      ))}
    </List>
  );
}
