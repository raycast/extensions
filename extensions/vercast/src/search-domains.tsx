import DomainListSection from "./pages/lists/domains-list";
import WithValidToken from "./pages/with-valid-token";

function Main() {
  return (
    <WithValidToken>
      <DomainListSection />
    </WithValidToken>
  );
}

export default Main;
