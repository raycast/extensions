import { FeedView } from "./my-feed";

const SAVED_TAG_ID = "user/-/state/com.google/starred";

export default function Command() {
  return <FeedView defaultStreamId={SAVED_TAG_ID} defaultStreamTitle="Saved Articles" enableStreamSelection={false} />;
}
