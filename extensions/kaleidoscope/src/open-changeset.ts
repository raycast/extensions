import { closeMainWindow, open, LaunchProps, Clipboard, Toast, showToast } from "@raycast/api";
import { KALEIDOSCOPE_BUNDLE_ID, checkKaleidoscopeInstallation } from "./utils/checkInstall";
import { URL_SCHEME, SUFFIX } from "./utils/urlScheme";

const commitIdPatternRegexp = /^[a-f0-9]{8,40}$/i;

export default async function main(props: LaunchProps<{ arguments: Arguments.OpenChangeset }>) {
  const { commitId } = props.arguments;

  const application = await checkKaleidoscopeInstallation();

  if (!application) {
    return;
  }

  try {
    let targetCommitId: string = "";
    let source = "";

    if (!commitId) {
      source = "Clipboard";
      const lastTextInClipboard = await Clipboard.readText();

      if (lastTextInClipboard != null) {
        targetCommitId = lastTextInClipboard;
      }
    } else {
      source = "Argument";
      targetCommitId = commitId;
    }

    if (!targetCommitId) {
      throw new Error("No Commit ID found.");
    } else if (!commitIdPatternRegexp.test(targetCommitId)) {
      throw new Error(`"${targetCommitId}" (from ${source}) is not a valid Commit ID`);
    }

    const changesetUrl = `${URL_SCHEME}changeset?label=Raycast Changeset&${encodeURIComponent(
      targetCommitId,
    )}&${SUFFIX}`;

    console.log("Opening Kaleidoscope with URL:", changesetUrl);

    await open(changesetUrl, KALEIDOSCOPE_BUNDLE_ID);

    closeMainWindow({ clearRootSearch: true });
  } catch (e) {
    console.error("Open Changeset failed:", e);

    await showToast({
      style: Toast.Style.Failure,
      title: "Open Changeset Failed",
      message: e instanceof Error ? e.message : "Could not open git history",
    });
  }
}
