/* eslint-disable @raycast/prefer-title-case */
import { Action, ActionPanel, Detail, Icon } from "@raycast/api";

import { useOnlineCheck } from "@/hooks/useOnlineCheck";
import { usePasswordStrength } from "@/hooks/usePasswordStrength";

import { scoreToText } from "@/lib";

type Props = {
  password: string;
};

export const PasswordResult = ({ password }: Props) => {
  const { result, isLoading } = useOnlineCheck(password);
  const { text, data, isLoading: passwordStrengthLoading } = usePasswordStrength(password);

  const markdown = `${result}\n\n# Offline Password Strength Check\n\n${text}`;

  return (
    <Detail
      isLoading={isLoading || passwordStrengthLoading}
      markdown={markdown}
      metadata={
        !passwordStrengthLoading && data ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Password Score (0-4)" text={scoreToText(data.strength.score)} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Time to Crack: Online (throttled, 100/h)"
              text={data.strength.crackTimesDisplay.onlineThrottling100PerHour}
            />
            <Detail.Metadata.Label
              title="Time to Crack: Online (not throttled, 10/s)"
              text={data.strength.crackTimesDisplay.onlineNoThrottling10PerSecond}
            />
            <Detail.Metadata.Label
              title="Time to Crack: Offline (slow hash, 1e4/s)"
              text={data.strength.crackTimesDisplay.offlineSlowHashing1e4PerSecond}
            />
            <Detail.Metadata.Label
              title="Time to Crack: Offline (fast hash, 1e10/s)"
              text={data.strength.crackTimesDisplay.offlineFastHashing1e10PerSecond}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Estimated Guesses Needed" text={`${data.strength.guesses}`} />
            <Detail.Metadata.Label title="Order of Magnitude" text={`${data.strength.guessesLog10}`} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.TagList title="Dictionaries">
              {data.dictionaries.map((dict) => (
                <Detail.Metadata.TagList.Item
                  key={dict.lang}
                  text={`${dict.lang}${dict.version ? "-" + dict.version : ""}`}
                />
              ))}
            </Detail.Metadata.TagList>
          </Detail.Metadata>
        ) : (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Loading..." text="Please wait" />
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          {data && (
            <Action.CopyToClipboard
              title="Copy Offline Password Strength JSON"
              content={JSON.stringify(data.strength, null, 2)}
            />
          )}
          <ActionPanel.Section title="Websites">
            <Action.OpenInBrowser title="Have I Been Pwned?" icon={Icon.Globe} url={`https://haveibeenpwned.com`} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
