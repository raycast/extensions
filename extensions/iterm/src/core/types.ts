import { LaunchProps } from "@raycast/api";
import { DEFAULT_ITERM_PROFILE } from "./constants";

export type ProfileCommandDefaultProps = {
  command?: string[];
};

export type ActionCommandWithoutBashProps = {
  profile?: string;
};

export type ActionCommandDefaultProps = {
  profile?: string;
} & ProfileCommandDefaultProps;

export type CommandArguments = {
  command: string;
};

export type CommandProps = LaunchProps<{ arguments: CommandArguments }>;

export type LoggerFn = (message: string) => void;

export type FinderItemsFilter = "files" | "directories";

export type ErrorActionList = "close" | "createIssue" | "openFinder" | "openPrivacyAutomationPane";

export type ASEvalItermProfiles = string | typeof DEFAULT_ITERM_PROFILE;
