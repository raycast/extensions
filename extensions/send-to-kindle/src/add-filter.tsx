import { BrowserExtension, environment, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import FilterForm from "./filter-form";
import { extractDomainFromUrl } from "./filters";

type AddFilterCommandProps = {
  shouldPop?: boolean;
  onSaved?: () => void;
};

export default function AddFilterCommand({ shouldPop = false, onSaved }: AddFilterCommandProps) {
  const [domainValue, setDomainValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDomain() {
      try {
        if (!environment.canAccess(BrowserExtension)) {
          return;
        }

        const tabs = await BrowserExtension.getTabs();
        const activeTab = tabs.find((tab) => tab.active) ?? tabs[0];
        const domain = extractDomainFromUrl(activeTab?.url);

        if (domain && isMounted) {
          setDomainValue(domain);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Couldn't get domain",
          message,
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDomain();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <FilterForm
      mode="add"
      submitTitle="Save filter"
      navigationTitle="Add a skill"
      domainValue={domainValue}
      onDomainChange={setDomainValue}
      isLoading={isLoading}
      shouldPop={shouldPop}
      onSaved={onSaved}
    />
  );
}
