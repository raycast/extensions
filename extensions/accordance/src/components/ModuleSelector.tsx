import { List, Icon, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { fetchModules, discoverAllModules } from "../utils/moduleUtils";

interface ModuleSelectorProps {
  onModuleChange: (module: string) => void;
  initialModule?: string;
  showAllModules?: boolean;
}

export function ModuleSelector({ onModuleChange, initialModule, showAllModules = false }: ModuleSelectorProps) {
  const preferences = getPreferenceValues<Preferences>();
  const [modules, setModules] = useState<string[]>([]);
  const [selectedModule, setSelectedModule] = useState(initialModule || "");

  useEffect(() => {
    loadModules();
  }, []);

  useEffect(() => {
    if (selectedModule) {
      onModuleChange(selectedModule);
    }
  }, [selectedModule, onModuleChange]);

  async function loadModules() {
    try {
      if (showAllModules) {
        const { allModules } = await discoverAllModules();
        const moduleNames = allModules.map((m) => m.name);
        setModules(moduleNames);

        // Use initialModule if provided, otherwise use the first available module
        const moduleToSelect = initialModule || (moduleNames.length > 0 ? moduleNames[0] : "");
        setSelectedModule(moduleToSelect);
      } else {
        const { modules: moduleList, defaultModule } = await fetchModules(preferences.defaultText);
        setModules(moduleList);

        // Use initialModule if provided, otherwise use the default from fetchModules
        const moduleToSelect = initialModule || defaultModule;
        if (moduleList.includes(moduleToSelect)) {
          setSelectedModule(moduleToSelect);
        } else if (moduleList.length > 0) {
          setSelectedModule(moduleList[0]);
        }
      }
    } catch (error) {
      console.error("Failed to load modules:", error);
      // Fallback
      setModules(["First Text Module"]);
      setSelectedModule("First Text Module");
    }
  }

  return (
    <List.Dropdown
      tooltip={showAllModules ? "Select any Accordance module" : "Select Bible text module"}
      storeValue={true}
      value={selectedModule}
      onChange={(newValue) => {
        setSelectedModule(newValue);
      }}
    >
      <List.Dropdown.Section title={showAllModules ? "All Accordance Modules" : "Bible Text Modules"}>
        {modules.map((module) => (
          <List.Dropdown.Item key={module} title={module} value={module} icon={Icon.Book} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
