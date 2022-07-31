import { PropsContext } from "../../contexts";

export const withPropsContext = (Component: React.FC) => {
  return (props: any) => {
    return (
      <PropsContext.Provider value={props}>
        <Component {...props} />
      </PropsContext.Provider>
    );
  };
};
