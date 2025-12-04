const apps = [
  { title: "App Name", value: "Launch app" },
  {
    title: "%App Name",
    value: "Launch when opening the Bunch, but ignore when closing",
  },
  { title: "App Name ~5", value: "Launch app after 5 second delay" },
  { title: "- XX", value: "close all windows of preceding app" },
  { title: "- File", value: "open a file in preceding app (can be repeated)" },
  {
    title: "- 'spotlight search'",
    value: "Run a spotlight search and open the results in preceding app",
  },
  { title: "- #tag1 #tag2", value: "Search for macOS tags" },
  { title: "- {@~w}", value: "send a key command to the preceding app" },
  { title: "- [string]", value: "type a string in the preceding app" },
  { title: "!AppName", value: "Quit app" },
  {
    title: "!!AppName",
    value: "Launch app when closing bunch (double negative)",
  },
  {
    title: "!!!AppName",
    value: "Quit app when closing bunch (triple negative)",
  },
  {
    title: "@AppName",
    value: "Focus app (run at end of bunch to hide all other apps)",
  },
  { title: "AppName_", value: "Hide an app" },
  { title: "AppName^", value: "Force app to activate" },
];
const snippets = [
  {
    title: "< my.snippet",
    value: "An external file to be included in the bunch",
  },
  {
    title: "- KEY=value",
    value: "A variable to define for use in the snippet as ${KEY}",
  },
  { title: "< my.snippet#id", value: "Reference a section of a snippet file" },
  {
    title: `< my.snippet#id ?"Run this Snippet?"`,
    value: "Allow interactive confirmation of a snippet",
  },
];

const urls = [
  { title: "http://url", value: "Open URL in browser" },
  { title: "urlhandler://", value: "Open a system url handler" },
];
const bunchCommand = [
  { title: "(command)", value: "Run a Bunch command" },
  { title: "(dark mode [on|off])", value: "dark mode on/off" },
  { title: "(do not disturb [on|off])", value: "do not disturb on/off" },
  { title: "([hide|show] dock)", value: "hide/show dock" },
  { title: "(dock [left|right|bottom])", value: "dock left/right/bottom" },
  { title: "([hide|show] desktop)", value: "hide/show desktop" },
  { title: "(wallpaper [path(s)])", value: "change wallpaper" },
  { title: "(audio [input|output] device_name)", value: "audio input/output" },
  {
    title: "(audio [input|output] volume [0-100])",
    value: "audio input/output",
  },
  { title: "(audio [input|output] volume [0-100])", value: "audio volume" },
  { title: "(audio [input|output] [mute|unmute])", value: "mute/unmute audio" },
];
const applescript = [{ title: "* AppleScript command", value: "Execute Applescript" }];

const automatorWorkflow = [
  { title: "& Automator Workflow", value: "Run an Automator Workflow" },
  {
    title: "- key=value",
    value: "variable to pass to preceding workflow (can be repeated)",
  },
];

const shellCommands = [
  { title: "$ script_or_cmd [args]", value: "Shell script to execute" },
  {
    title: "- KEY=value",
    value: "Environment variable to export for preceding shell script (can be repeated)",
  },
];

const frontmatter = [
  {
    title: "close after",
    value: "Automatically close after an interval (e.g. 1h)",
  },
  { title: "close at", value: "Set a time to close daily (e.g. 5pm)" },
  {
    title: "close on",
    value: `Set a day and time to close weekly (e.g. Mon 5pm). Multiple day/times can be combined with commas`,
  },
  {
    title: "from file",
    value: "A file path to load additional key/value pairs",
  },
  { title: "from script", value: "A shell script path that returns YAML" },
  { title: "ignore", value: "Boolean determines menu display of a Bunch" },
  { title: "ignore if", value: "Logic to determine if Bunch displays in menu" },
  { title: "ignore unless", value: "Negative version of ignore if" },
  {
    title: "ignores state",
    value: "true allows open/close when already open/closed",
  },
  { title: "menu divider", value: "Add a menu divider before or after" },
  { title: "menu order", value: "Menu order, 0–99 at beginning, >100 at end" },
  { title: "only opens", value: "true has the same effect as toggles: false" },
  {
    title: "open at",
    value: "Set a time to open this bunch daily (e.g. 6:30am)",
  },
  { title: "open every", value: "Repeat open at intervals (e.g. 30m)" },
  {
    title: "open on",
    value: `Set a day and time to open weekly (e.g. Tue 8am). Multiple day/times can be combined with commas`,
  },
  { title: "quits apps", value: "always close apps open in other Bunches" },
  {
    title: "run after",
    value: "Comma-separated paths to scripts to run after opening",
  },
  {
    title: "run after close",
    value: "Comma-separated paths to scripts to run after closing",
  },
  {
    title: "run before",
    value: "Comma-separated paths to scripts to run before opening",
  },
  {
    title: "run before close",
    value: "Comma-separated paths to scripts to run before closing",
  },
  { title: "schedule if", value: "Only schedule on specific Mac(s) (UUID1 )" },
  { title: "schedule unless", value: "Negative version of schedule if" },
  {
    title: "sequence",
    value: "parallel or sequential, determines execution order",
  },
  {
    title: "shortcut",
    value: "Keyboard shortcut for opening the Bunch (e.g. @a)",
  },
  { title: "single bunch mode", value: "ignore prevents closing" },
  {
    title: "startup",
    value: `true, false, or ask to open on launch. Can also be a UUID2  run only on a specific Mac`,
  },
  {
    title: "tags",
    value: "Add tags to the Bunch for organization and batching",
  },
  { title: "title", value: "Set the menu display title. Emojis OK." },
  {
    title: "title prefix",
    value: `Set a prefix that goes before the menu title. Prefixes set by folder/tag frontmatter are combined`,
  },
  { title: "toggles", value: "false prevents toggling this Bunch open/closed" },
];

const urlHandler = [
  { title: "x-bunch://open?bunch=[BUNCH NAME]", value: "Open a Bunch" },
  { title: "x-bunch://[BUNCH NAME]", value: "Open shorthand" },
  { title: "x-bunch://close?bunch=[BUNCH NAME]", value: "Close a Bunch" },
  { title: "x-bunch://close/[BUNCH NAME]", value: "Close shorthand" },
  { title: "x-bunch://toggle?bunch=[BUNCH NAME]", value: "Toggle a Bunch" },
  { title: "x-bunch://toggle/[BUNCH NAME]", value: "Toggle shorthand" },
  { title: "x-bunch://raw?txt=[BUNCH TEXT]", value: "Run raw text as a Bunch" },
  {
    title: "x-bunch://snippet?file=[SNIPPET PATH]&fragment=[FRAGMENT]&foo=bar",
    value: "Run a snippet with fragment and variables",
  },
];

export const bunchReferences = [
  { section: "Apps", items: apps },
  { section: "Snippets", items: snippets },
  { section: "URLs", items: urls },
  { section: "Bunch Command", items: bunchCommand },
  { section: "Applescript", items: applescript },
  { section: "Automator Workflow", items: automatorWorkflow },
  { section: "Shell Commands", items: shellCommands },
  { section: "Frontmatter", items: frontmatter },
  { section: "URL Handler", items: urlHandler },
];
