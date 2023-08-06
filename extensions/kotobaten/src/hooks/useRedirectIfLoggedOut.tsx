import { useNavigation } from "@raycast/api";
import { useEffect } from "react";
import { isAuthenticated } from "../services/authentication";
import Authenticate from "../authenticate";

const useRedirectIfUnauthenticated = () => {
  const navigation = useNavigation();
  useEffect(() => {
    const redirectIfLoggedOut = async () => {
      if (!(await isAuthenticated())) {
        navigation.push(<Authenticate />);
      }
    };

    redirectIfLoggedOut();
  }, [navigation]);
};

export default useRedirectIfUnauthenticated;
