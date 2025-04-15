import { Action, ActionPanel, Color, Detail, environment, Icon, Keyboard } from "@raycast/api";
import { format } from "date-fns";

import ResultActions from "./ResultActions";

import { Field, Record, Data } from "../types";
import useInstances from "../hooks/useInstances";
import useFavorites from "../hooks/useFavorites";
import FavoriteForm from "./FavoriteForm";

export default function ResultDetail({ result, fields }: { result: Record; fields: Field[] }) {
  const { commandName } = environment;

  const { selectedInstance } = useInstances();
  const { isUrlInFavorites, addUrlToFavorites, removeFromFavorites } = useFavorites();

  const { alias = "", name: instanceName = "" } = selectedInstance || {};

  const instanceUrl = `https://${instanceName}.service-now.com`;

  let markdown = "";
  if (result.metadata.thumbnailURL) markdown += `![Illustration](${instanceUrl}/${result.metadata.thumbnailURL})\n\n`;

  markdown += `# ${result.metadata.title}\n\n`;
  markdown += `${result.metadata.description || ""}`;

  const favoriteId = isUrlInFavorites(`${instanceUrl}${result.record_url}`);

  return (
    <Detail
      navigationTitle={`${commandName == "search" ? "Search" : "Quickly Search"} > ${alias ? alias : instanceName} > ${result.metadata.title}`}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {favoriteId && <Detail.Metadata.Label title="" icon={{ source: Icon.Star, tintColor: Color.Yellow }} />}
          {fields.map((field: Field) => {
            if (field.name != "sys_id") {
              const fieldData = result.data[field.name as keyof Data];

              if (field.type == "glide_date")
                return (
                  <Detail.Metadata.Label
                    key={field.name}
                    title={field.label}
                    text={fieldData ? format(new Date(fieldData.value + " UTC"), "dd MMM yyyy") : ""}
                  />
                );

              if (field.type == "glide_date_time")
                return (
                  <Detail.Metadata.Label
                    key={field.name}
                    title={field.label}
                    text={fieldData ? format(new Date(fieldData.value + " UTC"), "dd MMM yyyy HH:mm") : ""}
                  />
                );

              if (field.type == "reference") {
                if (fieldData)
                  return (
                    <Detail.Metadata.Link
                      key={field.name}
                      title={field.label}
                      text={fieldData.display}
                      target={`${instanceUrl}/${field.reference}.do?sys_id=${fieldData.value}`}
                    />
                  );
                else return <Detail.Metadata.Label key={field.name} title={field.label} text={""} />;
              }

              if (field.name.includes("category"))
                return (
                  <Detail.Metadata.TagList key={field.name} title="Category">
                    <Detail.Metadata.TagList.Item
                      text={result.data[field.name as keyof Data]?.display}
                      color={Color.Green}
                    />
                  </Detail.Metadata.TagList>
                );
              else if (field.name.includes("state"))
                return (
                  <Detail.Metadata.TagList key={field.name} title="State">
                    <Detail.Metadata.TagList.Item
                      text={result.data[field.name as keyof Data]?.display}
                      color={Color.Blue}
                    />
                  </Detail.Metadata.TagList>
                );
              else if (field.name.includes("priority"))
                return (
                  <Detail.Metadata.Label
                    key={field.name}
                    title={field.label}
                    icon={
                      fieldData && (fieldData.value as number) < 3
                        ? {
                            source: Icon.Bell,
                            tintColor: (fieldData.value as number) == 1 ? Color.Red : Color.Orange,
                          }
                        : null
                    }
                    text={result.data[field.name as keyof Data]?.display}
                  />
                );
              else
                return (
                  <Detail.Metadata.Label
                    key={field.name}
                    title={field.label}
                    text={result.data[field.name as keyof Data]?.display}
                  />
                );
            }
          })}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ResultActions result={result} />
          {!favoriteId && (
            <Action
              title="Add Favorite"
              icon={Icon.Star}
              onAction={() => addUrlToFavorites(result.metadata.title, result.record_url)}
              shortcut={{ modifiers: ["shift", "cmd"], key: "f" }}
            />
          )}
          {favoriteId && (
            <>
              <Action.Push
                title="Edit Favorite"
                icon={Icon.Pencil}
                target={<FavoriteForm favoriteId={favoriteId} />}
                shortcut={Keyboard.Shortcut.Common.Edit}
              />
              <Action
                title="Remove Favorite"
                icon={Icon.StarDisabled}
                style={Action.Style.Destructive}
                onAction={() => removeFromFavorites(favoriteId, result.metadata.title, false)}
                shortcut={{ modifiers: ["shift", "cmd"], key: "f" }}
              />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
