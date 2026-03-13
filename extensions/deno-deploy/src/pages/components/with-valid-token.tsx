import type { FC, PropsWithChildren } from "react";
import { useEffect, useState } from "react";

import isValidToken from "@/utils/accesstoken";

const WithValidToken: FC<PropsWithChildren<object>> = ({ children }) => {
  const [isValid, setIsValid] = useState(false);
  useEffect(() => {
    setIsValid(isValidToken());
  }, []);

  if (!isValid) {
    return null;
  }

  return <>{children}</>;
};

export default WithValidToken;
