import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { getProgressIcon, useCachedPromise, useFrecencySorting } from "@raycast/utils";
import { ErrorType, getTokens } from "./utils/get-tokens";
import { useEffect, useState } from "react";
import { calculateTimeLeft, generateOtp } from "./utils/totp";
import { Image } from "@raycast/api";

function searchToken() {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(30));
  const { data: tokensData, isLoading, error } = useCachedPromise(getTokens);
  const { data, visitItem } = useFrecencySorting(tokensData, {
    key: (item) => item.issuer,
  });
  const progress = Math.round((timeLeft / 30) * 100) / 100;

  useEffect(() => {
    let id: NodeJS.Timeout;

    const updateTime = () => {
      setTimeLeft(calculateTimeLeft(30));
      id = setTimeout(updateTime, 1000 - new Date().getMilliseconds());
    };

    updateTime();
    return () => clearTimeout(id);
  }, []);

  if (error?.message === ErrorType.OTP_AUTH_NOT_INSTALLED) {
    return (
      <List>
        <List.EmptyView
          title="OTP Auth App Required"
          description="Please purchase/install OTP Auth from the Mac App Store to use this extension"
          icon={Icon.Warning}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Get Otp Auth" url="https://apps.apple.com/us/app/otp-auth/id1471867429" />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List>
      {isLoading ? (
        <List.EmptyView title="Loading..." />
      ) : (
        data?.map((item) => {
          const currentOtp = generateOtp(item.secret, item.period, item.algorithm);
          return (
            <List.Item
              title={item.label}
              key={item.secret}
              subtitle={item.issuer}
              icon={{
                source: `https://cdn.brandfetch.io/${item.issuer.toLowerCase()}.com/w/400/h/400/fallback/lettermark?c=1idww8EtfoIue1wW6bi`,
                mask: Image.Mask.RoundedRectangle,
              }}
              keywords={[item.label, item.issuer]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Otp" content={currentOtp.otp} onCopy={() => visitItem(item)} />
                  <Action.Paste title="Output Otp" content={currentOtp.otp} onPaste={() => visitItem(item)} />
                </ActionPanel>
              }
              accessories={[
                {
                  tag: `${currentOtp.otp}`,
                },
                {
                  icon: {
                    source: getProgressIcon(progress, "#CCC", {
                      background: Color.PrimaryText,
                    }),
                  },
                },
              ]}
            />
          );
        })
      )}
    </List>
  );
}

export default searchToken;
