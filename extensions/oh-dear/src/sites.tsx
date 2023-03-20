import { useEffect, useState } from "react";
import { Icon, List, ActionPanel, Action, getPreferenceValues, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { API_URL } from "./config";

export default function Command() {
  const [error, setError] = useState<Error>();
  const [sites, setSites] = useState<ISite[]>([]);
  const [loading, setLoading] = useState(true);

  const { API_TOKEN } = getPreferenceValues();

  async function getSites() {
    const response = await fetch(`${API_URL}/sites`, {
      headers: { Authorization: `Bearer ${API_TOKEN}` },
    });

    let data: { data: ISite[]; errors: IError[] } = { data: [], errors: [] };

    try {
      data = (await response.json()) as SitesResponse;
    } catch (e) {
      setError(new Error("while fetching your sites"));
    } finally {
      if (data.errors) {
        data.errors.forEach((error) => setError(error));
        setLoading(false);
      }

      setSites(data.data);
      setLoading(false);
    }
  }

  useEffect(() => {
    getSites();
  }, []);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error.message,
      });
    }
  }, [error]);

  return (
    <List isLoading={loading}>
      {sites && sites.length > 0 ? (
        sites.map((site) => {
          return (
            <List.Item
              key={site.id}
              icon={site.summarized_check_result === "succeeded" ? Icon.Checkmark : Icon.Circle}
              title={site.label}
              actions={
                <ActionPanel title="Oh Dear">
                  <Action.OpenInBrowser url={`https://ohdear.app/sites/${site.id}/active-checks`} />
                </ActionPanel>
              }
            />
          );
        })
      ) : (
        <List.EmptyView icon={Icon.QuestionMark} description="No Sites Found" />
      )}
    </List>
  );
}

type SitesResponse = {
  data: ISite[];
  errors: IError[];
};

interface IError {
  message: string;
  name: string;
}

interface ISite {
  id: number;
  url: string;
  sort_url: string;
  label: string;
  team_id: number;
  group_name: string;
  tags: [];
  latest_run_date: string;
  summarized_check_result: string;
  uses_https: boolean;
  checks: [];
  created_at: string;
  updated_at: string;
  broken_links_check_include_external_links: boolean;
  broken_links_whitelisted_urls: null;
  marked_for_deletion_at: null;
  uptime_check_payload: [];
  http_client_headers: [];
}
