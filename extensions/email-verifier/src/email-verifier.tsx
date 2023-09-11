import { Form, ActionPanel, Action, showToast, Detail, useNavigation, Toast, Color, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import axios from "axios";

type Values = {
  text: string;
};

export default function Command() {
  const { push } = useNavigation();
  const [text, setText] = useState("");

  const handleSubmit = async (value: Values) => {
    let submitAction: (() => void) | undefined;
    if (!text) {
      submitAction = () =>
        showToast({ title: "Empty field", message: "Missing email address", style: Toast.Style.Failure });
    } else {
      const ret = await checkEmailByQuery(value.text);
      submitAction = () => push(<Details {...ret} />);
    }
    submitAction?.();
  };

  return (
    <Form
      actions={
        text && (
          <ActionPanel>
            {<Action.SubmitForm onSubmit={handleSubmit} icon={Icon.Envelope} title="Check Email" />}
          </ActionPanel>
        )
      }
    >
      <Form.TextArea
        id="text"
        title="Email address"
        placeholder="Enter Email To Verify"
        value={text}
        onChange={setText}
      />
    </Form>
  );
}

const Details: React.FC<Result> = (r) => {
  const [isLoading, setIsLoading] = useState(true);
  const [markdown, setMarkdown] = useState("");
  const [jsonString, setJsonString] = useState("");

  useEffect(() => {
    let markdown = `#   Result\n\n`;
    markdown += `- email address: **${r.email}**\n`;
    markdown += `- if the email address has the correct format: **${answer(r.syntax.valid)}**\n`;
    if (r.syntax.valid) {
      markdown += `- username: **${r.syntax.username}**\n`;
      markdown += `- domain: **${r.syntax.domain}**\n`;
    }
    markdown += `- if domain has MX-Records: **${answer(r.has_mx_records)}**\n`;
    markdown += `- if domain is a free email domain: **${answer(r.free)}**\n`;
    markdown += `- if the email address is reachable: **${r.reachable}**\n`;
    markdown += `- if the email address hard bounced: **${answer(r.bounce)}**\n`;
    markdown += `- if this is a DEA (disposable email address): **${answer(r.disposable)}**\n`;
    markdown += `- if account is a role-based account: **${answer(r.role_account)}**\n`;

    const jsonRet = JSON.stringify(r, null, 2);

    setMarkdown(markdown);
    setJsonString(jsonRet);
    setIsLoading(false);
  }, [r]);

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      navigationTitle="Email Result"
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy JSON Result" content={jsonString} />
          <Action.OpenInBrowser title="Sponsor Project" icon={Icon.Heart} url="https://ko-fi.com/herbertlu" />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="JSON format result"
            text={{ color: Color.Blue, value: "Provided, see more in Actions Panel" }}
          />
          <Detail.Metadata.Link
            title="API"
            target="https://www.automizely.com/tools/email-verification"
            text="email-verification"
          />
          <Detail.Metadata.Link
            title="Acknowledgement"
            target="https://github.com/AfterShip/email-verifier"
            text="Aftership/email-verifier"
          />
        </Detail.Metadata>
      }
    />
  );
};

const emailVerifierApiURL = "https://websites.automizely.com/v1/public/email-verify";

type EmailResponse = {
  data: [Result];
};

type Result = {
  bounce: boolean;
  email: string;
  reachable: string;
  disposable: boolean;
  role_account: boolean;
  free: boolean;
  has_mx_records: boolean;
  syntax: {
    username: string;
    domain: string;
    valid: boolean;
  };
};

async function checkEmailByQuery(email: string): Promise<Result> {
  try {
    const resp = await axios.post<EmailResponse>(emailVerifierApiURL, {
      emails: [email],
    });
    return resp.data.data[0];
  } catch (err) {
    showToast({
      style: Toast.Style.Failure,
      title: `❌ Verify email address failed`,
      message: String(err),
    });
    return Promise.resolve({} as Result);
  }
}

function answer(a: boolean) {
  if (a) {
    return "yes";
  }
  return "no";
}
