import { DataProvider } from "../state/data";
import { LocaleProvider } from "../state/locale";

export const View: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
  return (
    <DataProvider>
      <LocaleProvider>{children}</LocaleProvider>
    </DataProvider>
  );
};
