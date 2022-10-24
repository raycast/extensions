import { getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { Octokit } from "octokit";
import { useEffect, useState } from "react";
import { getErrorMessage } from "./utils";

interface Project {
  id: number;
  name: string;
  full_name: string;
  owner_avatar_url?: string;
  stargazers_count: number;
}

export default function MyProjectsCommand(): JSX.Element {
  const { projects, error, isLoading } = useProjects("");
  if (error) {
    showToast({ style: Toast.Style.Failure, message: error, title: "Could not fetch Issues" });
  }
  return (
    <List isLoading={isLoading}>
      {projects?.map((p) => (
        <List.Item
          key={p.id.toString()}
          title={p.full_name}
          icon={p.owner_avatar_url}
          accessories={[{ text: `⭐ ${p.stargazers_count}` }]}
        />
      ))}
    </List>
  );
}

function useProjects(query: string | undefined): {
  projects: Project[] | undefined;
  error?: string;
  isLoading: boolean | undefined;
} {
  const [projects, setProjects] = useState<Project[]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    async function fetchData() {
      setIsLoading(true);
      setError(undefined);
      try {
        const prefs = getPreferenceValues();
        const pat = (prefs.pat as string) || undefined;

        const octokit = new Octokit({ auth: pat });
        const d = await octokit.rest.repos.listForAuthenticatedUser();
        const pros: Project[] = d.data?.map((p) => ({
          id: p.id,
          name: p.name,
          full_name: p.full_name,
          owner_avatar_url: p.owner?.avatar_url,
          stargazers_count: p.stargazers_count,
        }));
        for (const p of d.data) {
          //p.stargazers_count
          //console.log(p.stargazers_count);
          //console.log(`${p.name} ${p.full_name}`);
        }
        if (!cancel) {
          setProjects(pros);
        }
        //const d = await octokit.rest.issues.list();
        //console.log(d.data);
        //console.log(d.data);
        //await octokit.rest.repos.get({user})
        //octokit.rest.issues.list();
      } catch (error) {
        setError(getErrorMessage(error));
      } finally {
        if (!cancel) {
          setIsLoading(false);
        }
      }
    }
    fetchData();

    return () => {
      cancel = true;
    };
  }, [query]);

  return { projects, error, isLoading };
}
