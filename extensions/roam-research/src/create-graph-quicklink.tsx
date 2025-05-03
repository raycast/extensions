import { Form, ActionPanel, Action, getPreferenceValues } from "@raycast/api";
import { useMemo, useState } from "react";
import { useGraphsConfig } from "./utils";
import { usePromise } from "@raycast/utils";
import { getAllPagesCached } from "./roamApi";

// TODO: feel like the code in this file is not that good. Need to clean it up. Not doing it right now because I'm short of time and it's working

export default function CreateGraphQuicklink() {
  const preferences = getPreferenceValues<Preferences>();

  const [graphNameDropdownValue, setGraphNameDropdownValue] = useState<string>("");

  const [graphPageDropdownValue, setGraphPageDropdownValue] = useState<string>("");

  const [showTextBoxForGraphName, setShowTextBoxForGraphName] = useState<boolean>(false);
  const [graphNameTextFieldValue, setGraphNameTextFieldValue] = useState<string>("");

  const [openInDropdownValue, setOpenInDropdownValue] = useState<string>(preferences.openIn || "web");

  const { graphsConfig, isGraphsConfigLoading } = useGraphsConfig();
  const graphNames = Object.keys(graphsConfig);

  const { isLoading: isGraphPagesLoading, data: graphPagesData } = usePromise(
    (graphNameDropdownValue: string) => {
      if (!graphNameDropdownValue || graphNameDropdownValue === "useGraphNameTextField") {
        return Promise.resolve(null);
      } else {
        return getAllPagesCached(graphsConfig[graphNameDropdownValue]);
      }
    },
    [graphNameDropdownValue]
  );

  const getQuicklinkDetails = (
    graphNameDropdownVal: string,
    graphNameTextFieldVal: string,
    graphPageDropdownValue: string,
    openInDropdownVal: string
  ) => {
    const graphName = graphNameDropdownVal === "useGraphNameTextField" ? graphNameTextFieldVal : graphNameDropdownVal;
    const pageUid =
      graphNameDropdownVal === "useGraphNameTextField" || !graphPageDropdownValue ? null : graphPageDropdownValue;

    const urlPrefix =
      openInDropdownVal === "web" ? `https://roamresearch.com/#/app/${graphName}` : `roam://#/app/${graphName}`;
    const urlSuffix = pageUid ? `/page/${pageUid}` : "";
    const url = urlPrefix + urlSuffix;

    const quicklinkName =
      `Open Roam Graph "${graphName}"` + (pageUid && graphPagesData ? `'s page "${graphPagesData[pageUid]}"` : "");
    return { graphName, quicklinkLink: url, quicklinkName: quicklinkName };
  };

  const { quicklinkLink, quicklinkName } = useMemo(
    () =>
      getQuicklinkDetails(graphNameDropdownValue, graphNameTextFieldValue, graphPageDropdownValue, openInDropdownValue),
    [graphNameDropdownValue, graphNameTextFieldValue, graphPageDropdownValue, openInDropdownValue]
  );

  const handleGraphChange = (newValue: string) => {
    setGraphNameDropdownValue(newValue);
    if (newValue === "useGraphNameTextField") {
      // console.log("newValue: ", newValue);
      setShowTextBoxForGraphName(true);
    } else {
      setShowTextBoxForGraphName(false);
    }
  };

  return (
    <Form
      navigationTitle="A quick way to open a Roam graph / specific page"
      isLoading={isGraphsConfigLoading || isGraphPagesLoading}
      actions={
        <ActionPanel>
          <Action.CreateQuicklink
            quicklink={{ link: quicklinkLink, name: quicklinkName }}
            title={`Create Graph Quicklink`}
          />
        </ActionPanel>
      }
    >
      {!isGraphsConfigLoading && (
        <Form.Dropdown
          id="graphNameDropdown"
          title="For which graph?"
          autoFocus={true}
          value={graphNameDropdownValue}
          onChange={handleGraphChange}
        >
          {graphNames &&
            graphNames.map((graphName) => <Form.Dropdown.Item key={graphName} value={graphName} title={graphName} />)}
          <Form.Dropdown.Item key="useGraphNameTextField" value="useGraphNameTextField" title="Use another graph" />
        </Form.Dropdown>
      )}
      {!isGraphsConfigLoading && showTextBoxForGraphName && (
        <Form.TextField
          id="graphNameTextField"
          title="Graph Name"
          value={graphNameTextFieldValue}
          onChange={setGraphNameTextFieldValue}
        />
      )}
      {!isGraphsConfigLoading && (
        <Form.Dropdown
          id="openInDropdown"
          title="Open In"
          value={openInDropdownValue}
          onChange={setOpenInDropdownValue}
        >
          <Form.Dropdown.Item value="web" title="Default Browser" />
          <Form.Dropdown.Item value="desktop-app" title="Roam Desktop App" />
        </Form.Dropdown>
      )}
      {!isGraphsConfigLoading && !showTextBoxForGraphName && !isGraphPagesLoading && graphPagesData && (
        <Form.Dropdown
          id="graphPageDropdown"
          title="Specific Page?"
          value={graphPageDropdownValue}
          onChange={setGraphPageDropdownValue}
        >
          <Form.Dropdown.Item key="dailyNotesPage" value="" title="Daily Notes Page (default)" />
          {graphPagesData &&
            Object.entries(graphPagesData).map(([blockUid, nodeTitle]) => (
              <Form.Dropdown.Item key={blockUid} value={blockUid} title={nodeTitle} />
            ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}
