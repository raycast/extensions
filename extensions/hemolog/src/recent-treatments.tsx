import { Action, ActionPanel, getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { format } from "date-fns";

export type Treatment = {
  uid: string;
  date: string;
  type: string;
  sites?: string;
  cause?: string;
};

interface Preferences {
  API_KEY: string;
}

export default function Default() {
  const preferences = getPreferenceValues<Preferences>();
  const API_KEY = preferences.API_KEY;

  const { isLoading, data, error } = useFetch<Treatment[]>(
    `https://hemolog.com/api/recent-treatments?apikey=${API_KEY}`,
    {
      keepPreviousData: true,
    },
  );

  if (error) {
    showToast(Toast.Style.Failure, "Error", "Error fetching treatments. Verify your API key.");
  }

  return (
    <List isLoading={isLoading && !error} searchBarPlaceholder="Filter Treatments by type...">
      {data?.map((treatment) => (
        <TreatmentListItem key={treatment.uid} Treatment={treatment} />
      ))}
    </List>
  );
}

function TreatmentListItem(props: { readonly Treatment: Treatment }) {
  const Treatment = props.Treatment;

  const iconType = () => {
    switch (Treatment.type) {
      case "ANTIBODY":
        return "⚫";
      case "BLEED":
        return "🔴";
      case "PROPHY":
        return "🔵";
      case "PREVENTATIVE":
        return "🟢";
      default:
        return "⚪";
    }
  };

  // Fix for timezone issues when submitting on the first day of the month
  const dt = new Date(Treatment.date);
  const dateOnly = new Date(dt.valueOf() + dt.getTimezoneOffset() * 60 * 1000);

  return (
    <List.Item
      id={Treatment.uid}
      title={Treatment.type}
      subtitle={Treatment.cause ? `${Treatment.sites} — ${Treatment.cause}` : `${Treatment.sites}`}
      icon={iconType()}
      accessories={[{ text: format(dateOnly, "yyyy-MM-dd") }]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url="https://hemolog.com/home" />
        </ActionPanel>
      }
    />
  );
}
