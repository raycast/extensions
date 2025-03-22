import { createContext, useContext, useReducer, useState } from "react";
import { OrgListReducerAction, DeveloperOrg } from "../../types";
import orgListReducer from "../../reducers/orgListReducer";

//Instantiate Context objects for managing the org list and the loading state.
const OrgListContext = createContext<
  { orgs: Map<string, DeveloperOrg[]>; dispatch: React.Dispatch<OrgListReducerAction> } | undefined
>(undefined);
const LoadingContext = createContext<{ isLoading: boolean; setIsLoading: (loading: boolean) => void } | undefined>(
  undefined,
);

//Create an initial map for the reducer.
const initialOrgs: Map<string, DeveloperOrg[]> = new Map<string, DeveloperOrg[]>();

export const OrgListProvider: React.FC<React.PropsWithChildren<object>> = ({ children }) => {
  //Instantiate our reducer and loadingState hooks
  const [orgs, dispatch] = useReducer(orgListReducer, initialOrgs);
  const [isLoading, setIsLoading] = useState(true);

  //Return JSX with the children wrapped in the Context Providers.
  return (
    <OrgListContext.Provider value={{ orgs, dispatch }}>
      <LoadingContext.Provider value={{ isLoading, setIsLoading }}>{children}</LoadingContext.Provider>
    </OrgListContext.Provider>
  );
};

/**
 * Custom hook to get the OrgListContext.
 * @returns OrgListContext for reading and updating the Org List
 */
export const useMultiForceContext = () => {
  const data = useContext(OrgListContext);
  if (!data) {
    throw new Error("useData without DataProvider in tree");
  }

  return data;
};

/**
 * Custom hook to get the LoadingContext.
 * @returns LoadingContext for reading and updating the loading status.
 */
export const useLoadingContext = () => {
  const data = useContext(LoadingContext);
  if (!data) {
    throw new Error("useLoadingContext without DataProvider in tree");
  }

  return data;
};
