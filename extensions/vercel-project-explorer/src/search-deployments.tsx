import { useEffect, useState } from "react";
import { fetchDeployments } from "./vercel";

import { Deployment } from "./types";
import isValidToken from "./utils/is-valid-token";
import DeploymentsList from "./pages/lists/deployments-list";
import useVercel from "./hooks/use-vercel-info";

function Main() {
  isValidToken();

  const [deployments, setDeployments] = useState<Deployment[] | undefined>(undefined);

  const { selectedTeam } = useVercel();

  useEffect(() => {
    async function fetch() {
      const fetched = await fetchDeployments(selectedTeam?.id);

      setDeployments(fetched);
    }

    fetch();
  }, [selectedTeam]);

  return (
    <DeploymentsList deployments={deployments || []} />
  );
}

export default Main;
