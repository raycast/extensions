import { MainContent } from "@components";

import { ApplicationProvider } from "@providers";

export function ScriptCommandsList(): JSX.Element {
  return (
    <ApplicationProvider>
      <MainContent />
    </ApplicationProvider>
  );
}
