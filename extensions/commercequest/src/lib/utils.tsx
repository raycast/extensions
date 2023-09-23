import { Icon } from "@raycast/api";

export const mapIconCode = (type) => {
  switch (type) {
    case "discussion":
      return Icon.SpeechBubbleActive;
      break;
    case "idea":
      return Icon.LightBulb;
      break;
    case "question":
      return Icon.QuestionMark;
      break;
    case "category":
      return Icon.Layers;
      break;
    case "poll":
      return Icon.BarChart;
      break;
    case "article":
      return Icon.Document;
      break;
    default:
      return Icon.Circle;
      break;
  }
};
