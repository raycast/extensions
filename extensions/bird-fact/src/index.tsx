import { Action, ActionPanel, Detail, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { Fact } from "./types";
import { BASE_URL, FACTS_URL } from "./urlConstants";
import { useFetch } from "@raycast/utils";

const Command = () => {
  const preferences = getPreferenceValues<Preferences>();
  const { isLoading, data, revalidate } = useFetch<Fact>(FACTS_URL.replace(":locale", preferences.locale));

  const markdown = data
    ? `${data.fact} ![](${BASE_URL}/${data.photo?.url})`
    : `No fact found for locale ${preferences.locale}`;

  if (!data) return <Detail isLoading={isLoading} markdown={markdown} />;

  return (
    <>
      <Detail
        isLoading={isLoading}
        markdown={markdown}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label text={data.species.common_name} title="Common name" />
            <Detail.Metadata.Label text={data.species.scientific_name} title="Scientific name" />
            {data.photo && (
              <>
                <Detail.Metadata.Separator />
                <Detail.Metadata.Label text={data.photo.photographer} title="Photographer" />
                <Detail.Metadata.Label text={data.photo.source} title="Photo source" />
              </>
            )}
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action title="Get New Fact" onAction={revalidate} />
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </>
  );
};

export default Command;
