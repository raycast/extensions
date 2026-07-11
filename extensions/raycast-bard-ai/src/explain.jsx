import ResultView from "./api/common";

const toast_title = "Explaining...";

export default function Explain() {
  return ResultView("Explain the given text.", toast_title, "text", "Explain");
}
