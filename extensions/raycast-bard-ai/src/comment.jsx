import ResultView from "./api/common";

const toast_title = "Commenting...";

export default function Comment() {
  return ResultView("Add comments to the given code.", toast_title, "code", "Comment");
}