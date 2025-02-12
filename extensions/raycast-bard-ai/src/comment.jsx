import ResultView from "./api/common";

const toast_title = "Commenting...";

export default function Comment() {
  return ResultView("Add comments to the given code. DO NOT ADD ANYTHING ELSE.", toast_title, "code", "Comment");
}
