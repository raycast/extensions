import isValidToken from "./utils/is-valid-token";
import DeploymentsList from "./pages/lists/deployments-list";

function Main() {
  isValidToken();
  return <DeploymentsList />;
}

export default Main;
