import { Color, Icon } from "@raycast/api";

export function getIcon(activityType: string) {
  let source: Icon = Icon.Dot;
  let tintColor: Color = Color.PrimaryText;
  switch (activityType) {
    case "file_changed":
      source = Icon.ArrowClockwise;
      break;
    case "file_created":
      source = Icon.Plus;
      tintColor = Color.Green;
      break;
    case "file_deleted":
      source = Icon.Trash;
      tintColor = Color.Red;
      break;
    case "calendar_todo":
      source = Icon.Checkmark;
      break;
    case "calendar_event":
      source = Icon.Calendar;
      break;
    case "security":
      source = Icon.Binoculars;
      break;
    case "card":
      source = Icon.Person;
      break;
    case "deck":
    case "deck_card_description":
      source = Icon.List;
      break;
    default:
      console.log("Unrecognized icon type:", activityType);
  }
  return { source, tintColor };
}
