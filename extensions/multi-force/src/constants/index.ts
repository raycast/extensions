export const MISC_ORGS_SECTION_LABEL = "Miscellaneous Orgs";
export const NEW_SECTION_LABEL = "New Section";
export const HEX_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{8}|[A-Fa-f0-9]{4})$/;
export const STORAGE_KEY = "SALESFORCE_DEVELOPER_ORGS_STORE";
export const DEFAULT_COLOR = "#0000FF";
export const COLOR_WARNING_MESSAGE = `A valid HEX color is required. (ie: ${DEFAULT_COLOR})`;
export const SETUP_PATH = "/lightning/setup/SetupOneHome/home";
export const HOME_PATH = "/lightning/page/home";
export const CUSTOM_KEY = "Custom";
export const PATH_OPTIONS = [
  { key: "Lightning Home", value: HOME_PATH },
  { key: "Setup Home", value: SETUP_PATH },
  { key: CUSTOM_KEY, value: CUSTOM_KEY },
];
export const ADD_AN_ORG_LABEL = "Add an Org";
export const ADD_AN_ORG_DESCRIPTION =
  "Enter the following information for your org. When you submit the form, Salesforce will prompt you to log in.";
export const ORG_TYPE_LABEL = "Org Type";
export const ORG_TYPE_DESCRIPTION =
  "What type of org are you logging into? If you have a custom URL, choose the 'Custom' option.";
export const CUSTOM_LOGIN_URL_LABEL = "Custom URL";
export const CUSTOM_LOGIN_URL_DESCRIPTION = "Enter the URL used to log into your org.";
export const CUSTOM_LOGIN_URL_PLACEHOLDER = "https://my-custom-org.sandbox.my.salesforce.com";
export const ORG_ALIAS_LABEL = "Org Alias";
export const ORG_ALIAS_DESCRIPTION =
  "Enter an alias for your org. This alias is used to uniquely identify your org. If you use VSCode or the SF CLI tools, this alias will also be displayed there.";
export const ORG_ALIAS_PLACEHOLDER = "my-development-org";
export const ORG_LABEL_LABEL = "Label";
export const ORG_LABEL_DESCRIPTION = "Enter a label to use with your org.";
export const ORG_LABEL_PLACEHOLDER = "My Org";
export const COLOR_LABEL = "Color";
export const COLOR_DESCRIPTION = `Enter a HEX color to use as the tint for the Salesforce Icon on your org.`;
export const OPEN_TO_LABEL = "Open To";
export const OPEN_TO_DESCRIPTION = "What page do you want to open when you log in?";
export const CUSTOM_PATH_LABEL = "Custom Path";
export const CUSTOM_PATH_DESCRIPTION =
  "Enter the path you want to open when you log in. When providing a path, make sure to leave out the root url.";
export const CUSTOM_PATH_PLACEHOLDER = "/lightning/o/Account/list?filterName=__Recent";
export const SECTION_LABEL = "Section";
export const SECTION_DESCRIPTION =
  "Select a section to group orgs on your list. If you want to create a new group, choose the 'New Section' option.";
export const NEW_SECTION_NAME_LABEL = "New Section Name";
export const NEW_SECTION_DESCRIPTION =
  "Enter a new name for grouping your orgs into sections. When you save an org with a new section name, the option will get added to the Section dropdown above.";
export const RECENTLY_USED_SECTION = "Recently Used";
