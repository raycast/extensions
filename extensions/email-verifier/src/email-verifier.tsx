import { ActionPanel, Action, Detail, Color, Icon, LaunchProps } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";

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
type EmailResponse = {
  data: [Result];
};
export default function Command(props: LaunchProps<{ arguments: Arguments.EmailVerifier }>) {
  const emailVerifierApiURL = "https://websites.automizely.com/v1/public/email-verify";

  const { email } = props.arguments;
  const { isLoading, data, error } = useFetch(emailVerifierApiURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      emails: [email],
    }),
    mapResult(result: EmailResponse) {
      return {
        data: result.data[0],
      };
    },
    failureToastOptions: {
      title: `❌ Verify email address failed`,
    },
  });
  return !data ? (
    <Detail
      isLoading={isLoading}
      markdown={isLoading ? "Loading..." : error ? `## ERROR \n\n Something went wrong` : ""}
    />
  ) : (
    <Details {...data} />
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
          <Detail.Metadata.Link title="Send Email" text={r.email} target={`mailto:${r.email}`} />
        </Detail.Metadata>
      }
    />
  );
};

function answer(a: boolean) {
  if (a) {
    return "yes";
  }
  return "no";
}
