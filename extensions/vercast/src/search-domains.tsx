import DomainListSection from "./pages/lists/domains-list";
import isValidToken from "./utils/is-valid-token";

function Main() {
  isValidToken();
  return <DomainListSection />;
}

export default Main;
