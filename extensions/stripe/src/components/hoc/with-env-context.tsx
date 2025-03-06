import { useState } from "react";
import { Environment } from "../../types";
import { EnvironmentContext } from "../../contexts";

export const withEnvContext = (Component: React.FC) => {
  return (props: any) => {
    const [environment, setEnvironment] = useState<Environment>("live");
    return (
      <EnvironmentContext.Provider value={{ environment, setEnvironment }}>
        <Component {...props} />
      </EnvironmentContext.Provider>
    );
  };
};
