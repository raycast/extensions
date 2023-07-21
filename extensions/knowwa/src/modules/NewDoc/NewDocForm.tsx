import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  getPreferenceValues,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import axios from "axios";
import dayjs from "dayjs";
import { apiUrl, baseUrl } from "../../constants/constants";
import { Template } from "../../types/types";

interface Preferences {
  AccessToken: string;
}

export default function NewDocForm({ template }: { template: Template }) {
  const preferences = getPreferenceValues<Preferences>();
  const { pop } = useNavigation();

  const submitForm = async (values: object) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Generating your Document",
    });
    try {
      const data = await axios.post(
        `${apiUrl}/templates/${template.uuid}/documents`,
        values,
        {
          headers: {
            Authorization: `Bearer ${preferences["AccessToken"]}`,
            accept: "application/json ",
          },
        }
      );

      await Clipboard.copy(`${baseUrl}/view-doc/${data.data.document_id}`);

      pop();
      toast.style = Toast.Style.Success;
      toast.title = "Document Generated and URL copied to clipboard!";
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not generate Document";
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Generate new Document"
            onSubmit={(values) => submitForm(values)}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="kn-doc-name"
        title="Document Title"
        defaultValue={`${template.name} ${dayjs().format("YYYY-DD-MM")}`}
      />
      {template.inputs?.map((elem) => (
        <Form.TextField
          key={elem.identifier}
          id={elem.identifier}
          title={elem.identifier}
        />
      ))}
    </Form>
  );
}
