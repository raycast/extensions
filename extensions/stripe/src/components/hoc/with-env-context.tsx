import { useState } from "react";
import { Environment } from "../../types";
import { EnvironmentContext } from "../../contexts";

export const withEnvContext = <P extends object>(Component: React.FC<P>) => {
  return (props: P) => {
    const [environment, setEnvironment] = useState<Environment>("live");
    return (
      <EnvironmentContext.Provider value={{ environment, setEnvironment }}>
        <Component {...props} />
      </EnvironmentContext.Provider>
    );
  };
};
