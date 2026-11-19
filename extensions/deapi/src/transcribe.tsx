import { LaunchProps } from "@raycast/api";
import { Loader } from "./components/Loader";
import { TranscribeForm } from "./components/TranscribeForm";
import { linkFromSelectionOrClipboard } from "./lib/selection";

export default function Command(props: LaunchProps<{ arguments: Arguments.Transcribe }>) {
  const link = props.arguments.link?.trim();
  if (link) return <TranscribeForm initialLink={link} />;
  return <Loader load={linkFromSelectionOrClipboard} render={(found) => <TranscribeForm initialLink={found} />} />;
}
