import { getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { Octokit, App } from "octokit";
import { useEffect, useState } from "react";
import { getErrorMessage } from "./utils";

interface Issue {
  id: string;
}

export default function IssuesCommand(): JSX.Element {
  const { issues, error, isLoading} = useIssues("");
  if(error){
    showToast({ style: Toast.Style.Failure, message: error, title: "Could not fetch Issues"});
  }
  return <List />;
}

function useIssues(query: string | undefined): {
  issues: Issue[] | undefined;
  error?: string;
  isLoading: boolean | undefined;
} {
  const [issues, setIssues] = useState<Issue[]>();
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
        /*const d = await octokit.rest.repos.listForAuthenticatedUser();
        for(const p of d.data){
          console.log(`${p.name} ${p.full_name}`);
        }*/
        const d = await octokit.rest.issues.list();
        console.log(d.data);
        //console.log(d.data);
        //await octokit.rest.repos.get({user})
        //octokit.rest.issues.list();
        
      } catch (error) {
        setError(getErrorMessage(error));
      }
      finally{
        if(!cancel){
          setIsLoading(false);
        }
      }
      
    };
    fetchData();

    return () => {
      cancel = true;
    }
  }, [query]);

  return { issues, error, isLoading };
}
