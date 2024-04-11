import { Detail } from "@raycast/api";
import HistoryDetails from "../components/HistoryDetails";
import { useHistoryState } from "../store/history";

interface Props {
  id: string;
}

export default function HistoryView({ id }: Props) {
  const history = useHistoryState((state) => state.history.find((a) => a.id === id));

  if (!history) {
    return (
      <Detail
        markdown={`## ⚠️ History Item Not Found\n\nWe're sorry, but it seems like the history item you're looking for does not exist.`}
      />
    );
  }

  return <HistoryDetails history={history} />;
}
