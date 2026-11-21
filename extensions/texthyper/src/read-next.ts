import { LaunchProps, open, showHUD, showToast, Toast } from "@raycast/api";
import { articleUrl } from "./lib/api";
import { currentLibrary } from "./lib/library";
import { displayTitle, inProgress, minutesLeft, pickNext, readingTime } from "./lib/logic";
import { ensureSignedIn, failed } from "./lib/no-view";

export default async function Command(props: LaunchProps<{ arguments: Arguments.ReadNext }>) {
  if (!(await ensureSignedIn())) return;

  const typed = props.arguments?.minutes?.trim();
  const minutes = typed ? Number.parseInt(typed, 10) : undefined;
  if (typed && !(minutes && minutes > 0)) {
    await showToast({ style: Toast.Style.Failure, title: "Minutes is a number", message: 'Like "10"' });
    return;
  }

  const toast = await showToast({ style: Toast.Style.Animated, title: "Picking something to read" });
  try {
    const library = await currentLibrary();
    const pick = pickNext(Object.values(library.articles), minutes);
    if (!pick) {
      toast.style = Toast.Style.Success;
      toast.title = "Nothing left to read";
      toast.message = "Your unread list is empty.";
      return;
    }

    const { article, fits } = pick;
    const left = readingTime(minutesLeft(article));
    const length = inProgress(article) ? `${left} left` : left;
    await open(articleUrl(article));
    await toast.hide();
    await showHUD(fits ? `${displayTitle(article)} · ${length}` : `Nothing that short. Shortest: ${length}`);
  } catch (error) {
    await failed(toast, error, "Could not pick an article");
  }
}
