import { Action, ActionPanel, Clipboard, closeMainWindow, Icon, List, showHUD, showToast, Toast, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { getProgressIcon } from "@raycast/utils";
import gopass from "./gopass";
import { humanize, isValidUrl, generateOTPFromUrl, isOtpauthUrl, extractOtpauthUrls, getOTPRemainingTime, getOTPProgress, parseOtpauthUrl } from "./utils";
import { copyPassword, pastePassword, copyOTP, pasteOTP, removePassword } from "./index";
import CreateEditPassword from "./create-edit";

async function copy(key: string, value: string): Promise<void> {
  await Clipboard.copy(value);
  await closeMainWindow();
  await showHUD(`${key} copied`);
}

async function paste(key: string, value: string): Promise<void> {
  await showHUD(`${key} pasted`);
  await Clipboard.paste(value);
  await closeMainWindow();
}


export default function ({ entry }: { entry: string }): JSX.Element {
  const [details, setDetails] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [timer, setTimer] = useState<number>(0);
  const [otpCodes, setOtpCodes] = useState<{ [url: string]: string }>({});

  const updateOTPCodes = (urls: string[]) => {
    const newCodes: { [url: string]: string } = {};
    urls.forEach(url => {
      try {
        newCodes[url] = generateOTPFromUrl(url);
      } catch (error) {
        console.warn("Failed to generate OTP:", error);
        newCodes[url] = "ERROR";
      }
    });
    setOtpCodes(newCodes);
  };

  const updateTimer = () => {
    setTimer(Date.now()); // Use current timestamp instead of just remaining time
  };

  const getProgressColor = (remaining: number, period: number = 30): Color => {
    if (remaining > period * 0.5) {
      return Color.Green;
    } else if (remaining > period * 0.2) {
      return Color.Yellow;
    } else {
      return Color.Red;
    }
  };

  useEffect((): void => {
    gopass
      .show(entry)
      .then((value) => {
        // upstream changed show() to return {password, attributes}
        // but we need to check for otpauth:// in the password line too
        const allLines = [value.password, ...value.attributes];
        setDetails(value.attributes);
        const otpauthUrls = extractOtpauthUrls(allLines);
        updateOTPCodes(otpauthUrls);
      })
      .catch(async (error) => {
        console.error(error);
        await showToast({ title: "Could not load passwords", style: Toast.Style.Failure });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    updateTimer();
    const interval = setInterval(async () => {
      updateTimer();
      
      // Check if any OTP period has reset and regenerate codes if needed
      try {
        const value = await gopass.show(entry);
        const allLines = [value.password, ...value.attributes];
        const otpauthUrls = extractOtpauthUrls(allLines);
        let shouldRegenerate = false;
        
        otpauthUrls.forEach(url => {
          const { period } = parseOtpauthUrl(url);
          const remaining = getOTPRemainingTime(period);
          if (remaining === period) {
            shouldRegenerate = true;
          }
        });
        
        if (shouldRegenerate) {
          updateOTPCodes(otpauthUrls);
        }
      } catch (error) {
        console.warn("Failed to refresh OTP codes:", error);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [entry]);

  return (
    <List isLoading={loading}>
      <List.Section title={"/" + entry}>
        {!loading && (
          <List.Item
            title="Password"
            subtitle="*****************"
            actions={
              <ActionPanel>
                <Action title="Copy to Clipboard" icon={Icon.Clipboard} onAction={() => copyPassword(entry)} />
                <Action title="Paste to Active App" icon={Icon.Document} onAction={() => pastePassword(entry)} />
                <Action.Push
                  title="Edit Password"
                  icon={Icon.EditShape}
                  target={<CreateEditPassword inputPassword={entry} />}
                />
                <Action title="Delete Password" icon={Icon.DeleteDocument} onAction={() => removePassword(entry)} />
              </ActionPanel>
            }
          />
        )}

        {Object.keys(otpCodes)
          .map((otpauthUrl, index) => {
            const { period } = parseOtpauthUrl(otpauthUrl);
            const otpCode = otpCodes[otpauthUrl] || "XXXXXX";
            const remaining = getOTPRemainingTime(period);
            const progress = getOTPProgress(period);
            
            return (
              <List.Item
                key={index}
                title="OTP code"
                subtitle={otpCode}
                accessories={[
                  {
                    text: `${remaining}/${period}s`
                  },
                  {
                    icon: { 
                      source: getProgressIcon(progress), 
                      tintColor: getProgressColor(remaining, period) 
                    }
                  }
                ]}
                actions={
                  <ActionPanel>
                    <Action title="Copy to Clipboard" icon={Icon.Clipboard} onAction={() => copyOTP(entry)} />
                    <Action title="Paste to Active App" icon={Icon.Document} onAction={() => pasteOTP(entry)} />
                    <Action.Push
                      title="Edit Password"
                      icon={Icon.EditShape}
                      target={<CreateEditPassword inputPassword={entry} />}
                    />
                    <Action title="Delete Password" icon={Icon.DeleteDocument} onAction={() => removePassword(entry)} />
                  </ActionPanel>
                }
              />
            );
          })}

        {/* Case 2: Standalone otpauth:// URLs */}
        {details
          .filter(isOtpauthUrl)
          .map((otpauthUrl, index) => (
            <List.Item
              key={`standalone-otp-${index}`}
              title="OTP Auth URL"
              subtitle="******"
              actions={
                <ActionPanel>
                  <Action title="Copy to Clipboard" icon={Icon.Clipboard} onAction={() => copy("OTP Auth URL", otpauthUrl)} />
                  <Action title="Paste to Active App" icon={Icon.Document} onAction={() => paste("OTP Auth URL", otpauthUrl)} />
                </ActionPanel>
              }
            />
          ))}

        {/* Case 3: Key-value pairs with otpauth:// URLs */}
        {details
          .filter((item) => {
            if (item.includes(": ")) {
              const [, value] = item.split(": ");
              return value && isOtpauthUrl(value);
            }
            return false;
          })
          .map((item, index) => {
            const [key] = item.split(": ");
            const otpauthUrl = item.split(": ").slice(1).join(": ");
            
            return (
              <List.Item
                key={`kv-otp-${index}`}
                title={humanize(key)}
                subtitle="******"
                actions={
                  <ActionPanel>
                    <Action title="Copy to Clipboard" icon={Icon.Clipboard} onAction={() => copy(key, otpauthUrl)} />
                    <Action title="Paste to Active App" icon={Icon.Document} onAction={() => paste(key, otpauthUrl)} />
                  </ActionPanel>
                }
              />
            );
          })}

        {/* Regular key-value pairs (excluding otpauth URLs) */}
        {details
          .filter((item) => {
            // Exclude standalone otpauth:// URLs
            if (isOtpauthUrl(item)) return false;
            
            // Exclude key-value pairs that contain otpauth:// URLs
            if (item.includes(": ")) {
              const [, value] = item.split(": ");
              if (value && isOtpauthUrl(value)) return false;
            }
            
            return true;
          })
          .map((item, index) => {
            const [key, ...values] = item.split(": ");
            const value = values.join(": ");

            return (
              <List.Item
                key={index}
                title={humanize(key)}
                subtitle={value}
                actions={
                  <ActionPanel>
                    {isValidUrl(value) && <Action.OpenInBrowser url={value} />}
                    <Action title="Copy to Clipboard" icon={Icon.Clipboard} onAction={() => copy(key, value)} />
                    <Action title="Paste to Active App" icon={Icon.Document} onAction={() => paste(key, value)} />
                  </ActionPanel>
                }
              />
            );
          })}
      </List.Section>
    </List>
  );
}
