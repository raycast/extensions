import { runAppleScript } from "run-applescript";

export const openGoogleChrome = async ({ directory = "Default", url }: { directory: string; url: string }) => {
  const script = `
    set theAppPath to quoted form of "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    set theProfile to quoted form of "${directory}"
    set theLink to quoted form of "${url}"
    do shell script theAppPath & " --profile-directory=" & theProfile & " " & theLink
  `;
  await runAppleScript(script);
};
