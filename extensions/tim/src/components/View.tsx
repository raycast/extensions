import { ActiveTaskProvider } from "../state/active-task";
import { DataProvider } from "../state/data";
import { LocaleProvider } from "../state/locale";

export const View: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
  return (
    <DataProvider>
      <ActiveTaskProvider>
        <LocaleProvider>{children}</LocaleProvider>
      </ActiveTaskProvider>
    </DataProvider>
  );
};
