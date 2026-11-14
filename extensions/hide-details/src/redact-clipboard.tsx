import { redactClipboard } from "./redaction";
import { Review } from "./review";

const load = (recognition?: "accurate") => redactClipboard({ recognition, fallbackToHistory: true, forReview: true });

export default function Command() {
  return <Review load={load} target="clipboard" />;
}
