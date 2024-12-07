import { JwtView } from "./components/jwt-view";
import { WaitView } from "./components/wait-view";
import useUserInput from "./utils/use-user-input";

const DecodeJwt = () => {
  const { ready, text } = useUserInput();

  if (!ready || text === undefined) {
    return <WaitView ready={ready} />;
  }
  return <JwtView jwtToken={text} />;
};

export default DecodeJwt;
