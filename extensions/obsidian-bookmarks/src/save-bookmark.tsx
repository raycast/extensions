import { ApplicationsProvider } from "./hooks/use-applications";
import { PreferencesProvider } from "./hooks/use-preferences";
import LinkForm from "./views/LinkForm";

export default function () {
  return (
    <ApplicationsProvider>
      <PreferencesProvider>
        <LinkForm />
      </PreferencesProvider>
    </ApplicationsProvider>
  );
}
