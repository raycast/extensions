import { Detail, getSelectedText, showHUD, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { v4 as uuidv4 } from "uuid";
import { isApfelInstalled } from "./api/apfel";
import { apfelExplain } from "./api/apfel/explain";
import { useHistory } from "./hooks/useHistory";
import IntelligenceNotReadyView from "./views/intelligence-not-ready";
import NotFoundView from "./views/not-found";

export default function Command() {
  const { data: availabilityData, isLoading: isCheckingAvailability } = usePromise(isApfelInstalled);

  if (isCheckingAvailability) return <Detail isLoading />;
  if (!availabilityData?.apfel) return <NotFoundView />;
  if (!availabilityData?.appleIntelligence) return <IntelligenceNotReadyView />;

  return <Explain />;
}

function Explain() {
  const history = useHistory();

  const { isLoading, data } = usePromise(async () => {
    const text = await getSelectedText();
    const trimmed = text?.trim();

    if (!trimmed) {
      await showHUD("No text selected");
      return;
    }

    await showToast({ style: Toast.Style.Animated, title: "Getting your explanation..." });

    const explanation = await apfelExplain(trimmed);

    await history.add({
      id: uuidv4(),
      created_at: new Date().toISOString(),
      answer: explanation,
      question: `Explain Text: ${trimmed}`,
    });

    await showToast({ style: Toast.Style.Success, title: "Got your explanation!" });

    return explanation;
  });

  return <Detail isLoading={isLoading} markdown={data} />;
}
