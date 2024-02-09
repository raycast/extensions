import CreatePlayground from "@/pages/form/create-playground";
import isValidToken from "@/utils/accesstoken";

function Main() {
  isValidToken();
  return <CreatePlayground />;
}

export default Main;
