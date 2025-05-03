import { useState, useEffect } from "react";
import { List, showToast, Toast, ActionPanel, Action, useNavigation, Icon } from "@raycast/api";
import fetch from "node-fetch";
import VariableDetail from "./VariableDetails";
import { Variable } from "./interfaces";

interface VariablesViewProps {
  collectionId: string;
  accessToken: string;
  fileKey: string;
}

interface ApiResponse {
  error?: boolean;
  meta?: {
    variableCollections: {
      [key: string]: {
        modes: Array<{ modeId: string; name: string }>;
        defaultModeId: string;
      };
    };
    variables: {
      [key: string]: {
        variableCollectionId: string;
      };
    };
  };
}

interface Mode {
  modeId: string;
  name: string;
}

interface ModesMap {
  [key: string]: string;
}

const VariablesView: React.FC<VariablesViewProps> = ({ collectionId, accessToken, fileKey }) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [modes, setModes] = useState<Mode[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedModeId, setSelectedModeId] = useState("");
  const [variables, setVariables] = useState<Variable[]>([]);
  const [allVariables, setAllVariables] = useState<Variable[]>([]);
  const [modesMap, setModesMap] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSyntaxType, setSelectedSyntaxType] = useState("WEB");
  const { push } = useNavigation();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`https://api.figma.com/v1/files/${fileKey}/variables/local`, {
          headers: { "X-Figma-Token": accessToken },
        });
        const data: ApiResponse = (await response.json()) as ApiResponse;
        if (!data || data.error) {
          showToast(Toast.Style.Failure, "Failed to fetch data");
          return;
        }
        setModes(data.meta?.variableCollections[collectionId]?.modes || []);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setVariables(
          Object.values(data.meta?.variables || {}).filter((variable): variable is Variable => {
            return "variableCollectionId" in variable && variable.variableCollectionId === collectionId;
          }) as Variable[],
        );
        setSelectedModeId(data.meta?.variableCollections[collectionId]?.defaultModeId || "");
        setAllVariables(Object.values(data.meta?.variables || {}) as Variable[]);
        const modesMap: ModesMap =
          data.meta?.variableCollections[collectionId]?.modes.reduce((acc: ModesMap, mode) => {
            acc[mode.modeId] = mode.name;
            return acc;
          }, {}) || {};
        setModesMap(modesMap);
      } catch (error) {
        if (error instanceof Error) {
          showToast(Toast.Style.Failure, "Failed to fetch data", error.message);
        } else {
          showToast(Toast.Style.Failure, "Failed to fetch data");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [collectionId, accessToken, fileKey]);

  const showVariableDetails = (variable: Variable) => {
    push(<VariableDetail variable={variable} allVariables={allVariables} modesMap={modesMap} />);
  };

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Select Syntax Type" value={selectedSyntaxType} onChange={setSelectedSyntaxType}>
          <List.Dropdown.Item title="Web" value="WEB" />
          <List.Dropdown.Item title="iOS" value="iOS" />
          <List.Dropdown.Item title="Android" value="ANDROID" />
        </List.Dropdown>
      }
    >
      {variables.map((variable) => {
        const syntaxValue = variable.codeSyntax?.[selectedSyntaxType] || "N/A";

        return (
          <List.Item
            key={variable.id}
            title={variable.name}
            accessories={[{ text: syntaxValue }]}
            actions={
              <ActionPanel>
                <Action title="View Details" onAction={() => showVariableDetails(variable)} />
                <Action.CopyToClipboard
                  title="Copy Code Syntax"
                  icon={Icon.Clipboard}
                  content={syntaxValue}
                  shortcut={{ modifiers: ["opt"], key: "arrowDown" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
};

export default VariablesView;
