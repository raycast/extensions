import { ApplicationsProvider } from "./hooks/use-applications";
import { PreferencesProvider } from "./hooks/use-preferences";
import LinkForm from "./views/LinkForm";
import VaultInspector from "./views/VaultInspector";

export default function () {
  return (
    <ApplicationsProvider>
      <PreferencesProvider>
        <VaultInspector>
          <LinkForm />
        </VaultInspector>
      </PreferencesProvider>
    </ApplicationsProvider>
  );
}
