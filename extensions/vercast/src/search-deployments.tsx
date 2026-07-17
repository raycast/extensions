import DeploymentsList from "./pages/lists/deployments-list";
import WithValidToken from "./pages/with-valid-token";

function Main() {
  return (
    <WithValidToken>
      <DeploymentsList />
    </WithValidToken>
  );
}

export default Main;
