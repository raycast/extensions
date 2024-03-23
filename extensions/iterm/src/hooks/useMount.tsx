import React from "react";

export const useMount = () => {
  const [mountState, setMountState] = React.useState(false);

  React.useEffect(() => {
    setMountState(true);

    return () => setMountState(false);
  }, []);

  return mountState;
};
