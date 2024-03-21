import { Action, ActionPanel, Color, Detail, Icon, LaunchProps, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { APIResponse } from "./utils/types";

export default function ValidateEmailAddress(props: LaunchProps<{ arguments: Arguments.ValidateEmailAddress }>) {
  const { email } = props.arguments;

  const ACCESS_KEY = getPreferenceValues<Preferences>().access_key;
  const USE_HTTPS = getPreferenceValues<Preferences>().use_https;
  const SMTP_CHECK = getPreferenceValues<Preferences>().smtp_check;

  const BASE_URL = USE_HTTPS ? "https://apilayer.net/api/check" : "http://apilayer.net/api/check";
  const API_URL = `${BASE_URL}?access_key=${ACCESS_KEY}&email=${email}&smtp=${SMTP_CHECK == true ? "1" : "0"}`;
  const { isLoading, data, revalidate } = useFetch<APIResponse>(API_URL);

  const markdown =
    data && "error" in data
      ? `# Email: ${email}

SUCCESS: ❌

Code: ${data.error.code}

Type: ${data.error.type}`
      : data
      ? `# Email: ${email}

SUCCESS: ✅`
      : `# Email: ${email}

SUCCESS: ⏳`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        !isLoading && data && !("error" in data) ? (
          <Detail.Metadata>
            <Detail.Metadata.Link title="Email" text={data.email} target={`mailto:${data.email}`} />
            <Detail.Metadata.Label
              title="Did You Mean?"
              icon={!data.did_you_mean ? Icon.Minus : undefined}
              text={data.did_you_mean}
            />
            <Detail.Metadata.Label title="User" icon={Icon.Person} text={data.user} />
            <Detail.Metadata.Link title="Domain" text={data.domain} target={data.domain} />
            <Detail.Metadata.Label title="Valid Format" icon={data.format_valid ? Icon.Check : Icon.Multiply} />
            <Detail.Metadata.Label title="Role" icon={data.role ? Icon.Check : Icon.Multiply} />
            <Detail.Metadata.Label title="Disposable" icon={data.disposable ? Icon.Check : Icon.Multiply} />
            <Detail.Metadata.Label title="Free" icon={data.free ? Icon.Check : Icon.Multiply} />
            <Detail.Metadata.TagList title="SMTP">
              <Detail.Metadata.TagList.Item
                text="smtp_check"
                icon={data.smtp_check ? Icon.Check : Icon.Multiply}
                color={data.smtp_check ? Color.Green : Color.Red}
              />
              <Detail.Metadata.TagList.Item
                text="MX-Records"
                icon={data.mx_found ? Icon.Check : Icon.Multiply}
                color={data.mx_found ? Color.Green : Color.Red}
              />
              <Detail.Metadata.TagList.Item
                text="Catch-All"
                icon={data.catch_all ? Icon.Check : Icon.Multiply}
                color={data.catch_all ? Color.Green : Color.Red}
              />
            </Detail.Metadata.TagList>
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action title={`Revalidate '${email}'`} icon={Icon.Redo} onAction={() => revalidate()} />
        </ActionPanel>
      }
    />
  );
}
