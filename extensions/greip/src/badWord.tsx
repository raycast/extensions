import React, { useState } from "react";
import {
  Toast,
  ActionPanel,
  Action,
  getPreferenceValues,
  Form,
  Icon,
  showToast,
  List,
  useNavigation,
  Detail,
  Color,
} from "@raycast/api";
import { Preferences } from "./types/preferences";
import axios from "axios";

interface ResultViewInputs {
  text: string;
  totalBadWords: number;
  isSafe: boolean;
  badWordsList: string[];
  riskScore: number;
}

function FormView() {
  const { push } = useNavigation();

  const preferences = getPreferenceValues<Preferences>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error>();
  const [nameError, setNameError] = useState<string | undefined>();

  function dropNameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }

  const lookupText = async (text: string) => {
    const nText = text.replace(/\n/g, " ");
    if (nText.length < 1) {
      setNameError("Required field!");
      return false;
    }
    setLoading(true);
    const res = await axios.get(
      "https://gregeoip.com/badWords?key=" + preferences.apikey + "&text=" + nText + "&listBadWords=yes"
    );
    if (res?.data?.status == "success") {
      setLoading(false);
      push(<ResultView data={res?.data?.data} />);
    } else {
      setLoading(false);
      setError(new Error(res?.data?.description));
    }
  };

  React.useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "ERR:",
        message: error.message,
      });
    }
  }, [error]);

  return !loading ? (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Lookup text" onSubmit={(values) => lookupText(values.text)} />
          <ActionPanel.Section title="Greip Pages">
            <Action.OpenInBrowser
              url="https://greip.io"
              title="Greip Website"
              shortcut={{ modifiers: ["cmd", "shift"], key: "1" }}
            />
            <Action.OpenInBrowser
              url="https://greip.io/dashboard/Home"
              title="Greip Dashboard"
              shortcut={{ modifiers: ["cmd", "shift"], key: "2" }}
            />
            <Action.OpenInBrowser
              url="https://docs.greip.io"
              title="Greip Documentation"
              shortcut={{ modifiers: ["cmd", "shift"], key: "3" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        autoFocus={true}
        storeValue={true}
        info="This text will be sent to Greip in order to check if it contains bad-words."
        placeholder="Type the text you want to lookup here.."
        error={nameError}
        onChange={dropNameErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setNameError("Required field!");
          } else {
            dropNameErrorIfNeeded();
          }
        }}
      />
    </Form>
  ) : (
    <List>
      <List.EmptyView icon={{ source: Icon.Hourglass }} title="Fetching the data.."></List.EmptyView>
    </List>
  );
}

function ResultView(props: { data: ResultViewInputs }) {
  const { data } = props;

  return (
    <Detail
      markdown={props.data.text}
      navigationTitle="Lookup result"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Total bad-words"
            text={
              data.totalBadWords > 1
                ? data.totalBadWords?.toString() + " words"
                : data.totalBadWords?.toString() + " word"
            }
          />
          <Detail.Metadata.TagList title="Safe?">
            <Detail.Metadata.TagList.Item
              text={data.isSafe ? "Yes" : "No"}
              color={data.isSafe ? Color.Green : Color.Yellow}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Bad-words List">
            {data.badWordsList.map((item: string) => (
              <Detail.Metadata.TagList.Item key={item.toString() + Math.random()} text={item} color={Color.Red} />
            ))}
            {data.badWordsList.length < 1 ? (
              <Detail.Metadata.TagList.Item text="N/A" color={Color.SecondaryText} />
            ) : (
              <></>
            )}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Rist Score" text={data.riskScore.toString()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Risk Score Table">
            <Detail.Metadata.TagList.Item text="0 = Safe" color={Color.Green} />
            <Detail.Metadata.TagList.Item text="1 = High Risk" color={Color.Red} />
            <Detail.Metadata.TagList.Item text="2 = Medium Risk" color={Color.Orange} />
            <Detail.Metadata.TagList.Item text="3 = Low Risk" color={Color.Yellow} />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel title="Greip - Bad-Word Detection">
          <ActionPanel.Section title="Copy Results">
            <Action.CopyToClipboard title="Copy Filtered Text" content={data.text} />
            <Action.CopyToClipboard title="Copy Bad-Words List" content={data.badWordsList?.join(" ")} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Greip Pages">
            <Action.OpenInBrowser
              url="https://greip.io"
              title="Greip Website"
              shortcut={{ modifiers: ["cmd", "shift"], key: "1" }}
            />
            <Action.OpenInBrowser
              url="https://greip.io/dashboard/Home"
              title="Greip Dashboard"
              shortcut={{ modifiers: ["cmd", "shift"], key: "2" }}
            />
            <Action.OpenInBrowser
              url="https://docs.greip.io"
              title="Greip Documentation"
              shortcut={{ modifiers: ["cmd", "shift"], key: "3" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  return <FormView />;
}
