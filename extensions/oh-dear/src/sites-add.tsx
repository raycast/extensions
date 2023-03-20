import { Form, ActionPanel, Action, popToRoot, LaunchProps, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";
import { API_URL } from "./config";

export default function Command() {
  const [error, setError] = useState<Error>();
  const [teams, setTeams] = useState<ITeam[]>([]);
  const [loading, setLoading] = useState(false);

  const [urlError, setUrlError] = useState<string | undefined>();
  const [teamError, setTeamError] = useState<string | undefined>();

  const { API_TOKEN } = getPreferenceValues();

  function dropUrlErrorIfNeeded() {
    if (urlError && urlError.length > 0) {
      setUrlError(undefined);
    }
  }

  function dropTeamErrorIfNeeded() {
    if (teamError && teamError.length > 0) {
      setTeamError(undefined);
    }
  }

  async function getMe() {
    const response = await fetch(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${API_TOKEN}` },
    });

    let data: { teams: ITeam[]; errors: IError } = { teams: [], errors: {} };
    try {
      data = (await response.json()) as MeResponse;
    } catch (e) {
      setError(new Error("while fetching your sites"));
    } finally {
      if (data.errors) {
        // data.errors.forEach((error) => setError(error));
        return false;
      }

      setTeams(data.teams);
    }
  }

  async function storeSite(values: ISiteValues) {
    setLoading(true);

    const response = await fetch(`${API_URL}/sites`, {
      headers: { Authorization: `Bearer ${API_TOKEN}`, Accept: "application/json", "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify(values),
    });

    let data: { url: string; summarized_check_result: string; errors: IError } = {
      url: "",
      summarized_check_result: "",
      errors: {},
    };

    try {
      data = (await response.json()) as SiteResponse;
    } catch (e) {
      setError(new Error("while fetching your sites"));
    } finally {
      if (data.errors?.url) {
        setError(new Error(data.errors.url));
        setLoading(false);
        return false;
      }

      if (data.errors?.team_id) {
        setError(new Error(data.errors.team_id));
        setLoading(false);
        return false;
      }

      showToast({
        title: "Site is added",
        message: `${data.url} has status ${data.summarized_check_result}`,
      });
      setLoading(false);
      popToRoot();
    }
  }

  useEffect(() => {
    getMe();
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
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={(values: ISiteValues) => storeSite(values)} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="awesome-site.com"
        error={urlError}
        onChange={dropUrlErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setUrlError("URL should't be empty!");
          } else {
            dropUrlErrorIfNeeded();
          }
        }}
      />
      <Form.Dropdown
        id="team_id"
        title="Team"
        error={teamError}
        onChange={dropTeamErrorIfNeeded}
        onBlur={(event) => {
          console.log(event.target.value);
          if (event.target.value?.length == 0) {
            setTeamError("Team should't be empty!");
          } else {
            dropTeamErrorIfNeeded();
          }
        }}
      >
        {teams &&
          teams.length > 0 &&
          teams.map((team) => {
            return <Form.Dropdown.Item key={team.id} value={String(team.id)} title={team.name} />;
          })}
      </Form.Dropdown>
    </Form>
  );
}

interface MeResponse {
  id: number;
  name: string;
  email: string;
  photo_url: string;
  teams: ITeam[];
  errors: IError;
}

interface ITeam {
  id: number;
  name: string;
  role: string;
}

interface SiteResponse {
  id: number;
  url: string;
  sort_url: string;
  label: string;
  team_id: number;
  group_name: "";
  tags: [];
  latest_run_date: null;
  summarized_check_result: string;
  uses_https: boolean;
  checks: [];
  errors: IError;
}

interface IError {
  url?: string;
  team_id?: string;
}
interface ISiteValues {
  url: string;
  team_id: string;
}
