import { spawn } from "child_process";

function runAppleScript(script: string, args: string[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = spawn("/usr/bin/osascript", ["-e", script, ...(args.length > 0 ? ["--", ...args] : [])], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let errorOutput = "";

    process.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    process.on("error", reject);

    process.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(errorOutput || `AppleScript exited with code ${code}`));
      }
    });
  });
}

export async function humanType(text: string): Promise<void> {
  const appleScript = `
on run argv
    set typingText to item 1 of argv

    tell application "System Events"

        -- Give the target application time to regain keyboard focus
        delay (random number from 180 to 350) / 1000

        repeat with i from 1 to (count characters of typingText)
            set currentChar to character i of typingText

            if currentChar is return or currentChar is linefeed then
                key code 36
                delay (random number from 250 to 600) / 1000

            else if currentChar is tab then
                key code 48
                delay (random number from 80 to 180) / 1000

            else if currentChar is "@" then
                -- German Windows keyboard: AltGr + Q produces @
                key down control
                key down option
                keystroke "q"
                key up option
                key up control

                delay (random number from 60 to 140) / 1000

            else
                keystroke currentChar

                if currentChar is space then
                    delay (random number from 50 to 140) / 1000

                else if currentChar is "," or currentChar is ";" or currentChar is ":" then
                    delay (random number from 100 to 250) / 1000

                else if currentChar is "." or currentChar is "!" or currentChar is "?" then
                    delay (random number from 250 to 650) / 1000

                else if currentChar is "-" or currentChar is "—" then
                    delay (random number from 100 to 220) / 1000

                else
                    delay (random number from 30 to 120) / 1000
                end if

                -- Occasional small hesitation
                set hesitation to (random number from 1 to 100)

                if hesitation ≤ 4 then
                    delay (random number from 100 to 300) / 1000
                end if
            end if
        end repeat
    end tell
end run
`;

  await runAppleScript(appleScript, [text]);
}

export async function humanTab(): Promise<void> {
  const appleScript = `
tell application "System Events"
    delay (random number from 80 to 160) / 1000
    key code 48
    delay (random number from 120 to 220) / 1000
end tell
`;

  await runAppleScript(appleScript);
}
