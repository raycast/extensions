import {
  Toast,
  ActionPanel,
  Action,
  getPreferenceValues,
  Form,
  showToast,
  useNavigation,
  Detail,
  Color,
  Icon,
} from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { FormValues } from "./types/form";
import { Preferences } from "./types/preferences";
import axios from "axios";
import { ResultViewInputs } from "./types/result";
import { getGreipActions } from "./utils";

function FormView() {
  const { push } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const nText = values.text.replace(/\n/g, " ");

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Fetching result...",
      });

      const res = await axios.get(
        `https://gregeoip.com/badWords?key=${preferences.apikey}&text=${nText}&listBadWords=yes`
      );
      if (res?.data?.status == "success") {
        push(<ResultView data={res?.data?.data} />);
        toast.style = Toast.Style.Success;
        toast.title = "Result fetched successfully!";
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = res?.data?.description;
      }
    },
    validation: {
      text: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Lookup Text" icon={Icon.Snippets} onSubmit={handleSubmit} />
          {getGreipActions()}
        </ActionPanel>
      }
    >
      <Form.TextArea
        storeValue={true}
        info="This text will be sent to Greip in order to check if it contains bad-words."
        placeholder="Type the text you want to lookup here.."
        {...itemProps.text}
      />
    </Form>
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
            text={`${data.totalBadWords?.toString()} word${data.totalBadWords > 1 ? "s" : ""}`}
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
            {data.badWordsList.length < 1 && <Detail.Metadata.TagList.Item text="N/A" color={Color.SecondaryText} />}
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
          {getGreipActions()}
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  return <FormView />;
}
