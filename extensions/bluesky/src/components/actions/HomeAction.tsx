import CustomAction from "./CustomAction";
import Home from "../../home";
import { useNavigation } from "@raycast/api";

const HomeAction = () => {
  const { push } = useNavigation();

  return <CustomAction actionKey="switchToHomeView" onClick={() => push(<Home />)} />;
};

export default HomeAction;
