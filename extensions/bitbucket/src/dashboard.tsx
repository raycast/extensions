import { render } from "@raycast/api";
import { Dashboard } from "./components/dashboard/index";

render(<Dashboard />);

// Removed from commands as it is still WIP
// follow on slack thread: https://raycastcommunity.slack.com/archives/C02HEMAF2SJ/p1638622573484100
//     {
//       "name": "dashboard",
//       "title": "Dashboard",
//       "subtitle": "Bitbucket",
//       "description": "Showing some useful informations at a glance",
//       "mode": "view"
//     }