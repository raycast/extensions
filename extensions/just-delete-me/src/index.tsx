import { ActionPanel, List, Action, Icon, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";

type Notes = {
  notes_de?: string;
  notes_ru?: string;
  notes_tr?: string;
  notes_pt_br?: string;
  notes_cat?: string;
  notes_es?: string;
  notes_fr?: string;
};
type Site = {
  name: string;
  difficulty: string;
  domains: string[];
  notes: string;
  url: string;
  email?: string;
  email_subject?: string;
  email_body?: string;
} & Notes;

function ucfirst(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function Command() {
  const { isLoading, data: sites } = useFetch(
    "https://raw.githubusercontent.com/jdm-contrib/jdm/master/_data/sites.json",
    {
      mapResult(result: string) {
        const data = JSON.parse(result) as Array<Site>;
        return {
          data,
        };
      },
      keepPreviousData: true,
      initialData: [],
    },
  );

  const difficultyColors = {
    easy: Color.Green,
    medium: Color.Yellow,
    hard: Color.Orange,
    limited: Color.Purple,
    impossible: Color.Red,
  } as { [key: string]: string };

  return (
    <List isLoading={isLoading} throttle searchBarPlaceholder="Search web services" isShowingDetail>
      <List.Section title={`${sites.length} web services`}>
        {sites.map((site: Site, index: number) => {
          let email = "";
          if (site.email) {
            const params = new URLSearchParams();
            if (site.email_subject) params.append("Subject", site.email_subject);
            if (site.email_body) params.append("body", site.email_body);
            email = `mailto:${site.email}?${params}`;
          }
          const emailMarkdown = !site.email
            ? ""
            : `\n\n ---- \n\n Email: ${site.email} \n\n Subject: ${site.email_subject || "N/A"} \n\n Body: ${
                site.email_body || "N/A"
              }`;
          const markdown =
            `## How to delete from ${site.name}\n\n ${site.notes || "No notes available."}` + emailMarkdown;
          return (
            <List.Item
              key={index}
              title={site.name}
              subtitle={ucfirst(site.difficulty)}
              icon={{ source: Icon.Info, tintColor: difficultyColors[site.difficulty] }}
              keywords={site.domains}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Go to Site" url={site.url} />
                  {email && <Action.OpenInBrowser icon={Icon.Envelope} title="Send Email" url={email} />}
                </ActionPanel>
              }
              detail={
                <List.Item.Detail
                  markdown={markdown}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Link title="URL" text={site.url} target={site.url} />
                      <List.Item.Detail.Metadata.TagList title="Difficulty">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={site.difficulty}
                          color={difficultyColors[site.difficulty]}
                        />
                      </List.Item.Detail.Metadata.TagList>
                      {site.email && (
                        <List.Item.Detail.Metadata.Link title="Send Email" text={site.email} target={email} />
                      )}
                      <List.Item.Detail.Metadata.Separator />
                      {site.domains.map((domain, domainIndex) => (
                        <List.Item.Detail.Metadata.Link
                          key={domain}
                          title={`Domain # ${domainIndex + 1}`}
                          text={domain}
                          target={domain}
                        />
                      ))}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
