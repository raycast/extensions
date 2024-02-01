import { spawnSync } from "child_process";
import { showToast, Toast, updateCommandMetadata } from "@raycast/api";
import { runAppleScript } from "run-applescript";

interface OptionData {
  menuBarVisibility: string;
  autohide: boolean;
  title: string;
}

const getOptionData: Record<string, OptionData> = {
  always: { menuBarVisibility: "0", autohide: true, title: "Always" },
  infull: { menuBarVisibility: "0", autohide: false, title: "In Full Screen Only" },
  ondesk: { menuBarVisibility: "1", autohide: true, title: "On Desktop Only" },
  never: { menuBarVisibility: "1", autohide: false, title: "Never" },
};

const scriptTrue = `
tell application "System Events"
	set autohide menu bar of dock preferences to true
	return "true"
end tell
`;

const scriptFalse = `
tell application "System Events"
	set autohide menu bar of dock preferences to false
	return "false"
end tell
`;

const getCurrentSystemOption = (): OptionData => {
  const cmd1 = spawnSync("defaults read NSGlobalDomain AppleMenuBarVisibleInFullscreen", { shell: true });
  const cmd2 = spawnSync("defaults read NSGlobalDomain _HIHideMenuBar", { shell: true });

  const menuBarVisibility = String(cmd1.output[1]).trim();
  const autohide = Boolean(Number(String(cmd2.output[1]).trim()));

  const matchingOption = Object.values(getOptionData).find(
    (option) => option.menuBarVisibility === menuBarVisibility && option.autohide === autohide
  );

  return matchingOption || { menuBarVisibility, autohide, title: "Unknown Option" };
};

export async function runToggleScript(optionOne: string, optionTwo: string): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Running...",
  });

  const currentOption = getCurrentSystemOption();

  const applyToggleOption = async (option: string) => {
    const { menuBarVisibility, autohide, title } = getOptionData[option];
    spawnSync(`defaults write NSGlobalDomain AppleMenuBarVisibleInFullscreen -int ${menuBarVisibility}`, {
      shell: true,
    });

    const result = autohide ? String(await runAppleScript(scriptTrue)) : String(await runAppleScript(scriptFalse));

    if (getOptionData[optionOne].autohide === getOptionData[optionTwo].autohide) {
      toast.style = isOptionOneCurrent ? Toast.Style.Failure : Toast.Style.Success;
    } else {
      toast.style = result === "true" ? Toast.Style.Failure : Toast.Style.Success;
    }

    toast.title = title;
  };

  const isOptionOneCurrent = compareOptions(optionOne, currentOption);
  const isOptionTwoCurrent = compareOptions(optionTwo, currentOption);

  if (isOptionOneCurrent || isOptionTwoCurrent) {
    const option = isOptionOneCurrent ? optionTwo : optionOne;
    await applyToggleOption(option);
  } else {
    await applyToggleOption(optionOne);
  }

  await updateCommandMetadata({ subtitle: `Status: ${getCurrentSystemOption().title}` });
}

const compareOptions = (option: string, currentOption: OptionData): boolean => {
  return (
    getOptionData[option].menuBarVisibility === currentOption.menuBarVisibility &&
    getOptionData[option].autohide === currentOption.autohide
  );
};
