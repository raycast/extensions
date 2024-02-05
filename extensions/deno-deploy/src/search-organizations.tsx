import OrganizationListSection from "@/pages/lists/organizations-list";
import isValidToken from "@/utils/accesstoken";

function Main() {
  isValidToken();
  return <OrganizationListSection />;
}

export default Main;
