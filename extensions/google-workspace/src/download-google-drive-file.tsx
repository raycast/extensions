import DriveFileList from "./components/DriveFileList";
import { withGoogleAuth } from "./components/withGoogleAuth";

function DownloadGoogleDriveFile(props: { arguments: Arguments.DownloadGoogleDriveFile }) {
  return <DriveFileList initialQuery={props.arguments.link} downloadFirst />;
}

export default withGoogleAuth(DownloadGoogleDriveFile);
