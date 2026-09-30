import { Icon } from "@raycast/api";

export const mapIconCode = (type: string) => {
  switch (type) {
    case "discussion":
      return Icon.SpeechBubbleActive;
    case "idea":
      return Icon.LightBulb;
    case "question":
      return Icon.QuestionMark;
    case "category":
      return Icon.Layers;
    case "poll":
      return Icon.BarChart;
    case "article":
      return Icon.Document;
    default:
      return Icon.Circle;
  }
};
