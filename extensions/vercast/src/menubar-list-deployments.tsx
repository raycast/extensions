import isValidToken from "./utils/is-valid-token";
import MenuBarProjectListSection from "./pages/lists/menubar-deployments";

function Main() {
  isValidToken();
  return <MenuBarProjectListSection />;
}

export default Main;
