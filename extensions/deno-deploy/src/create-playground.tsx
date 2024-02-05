import CreatePlayground from "@/pages/form/create-playground";
import isValidToken from "@/utils/accesstoken";

// Currently not working due to a bug, disabled for now

function Main() {
  isValidToken();
  return <CreatePlayground />;
}

export default Main;
