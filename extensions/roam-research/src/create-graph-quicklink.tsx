import { Form, ActionPanel, Action, getPreferenceValues } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { useGraphsConfig } from "./utils";
import { usePromise } from "@raycast/utils";
import { getAllPagesCached } from "./roamApi";
import { normalizeForSearch, tokenizeQuery, matchesTokens, rankMatch } from "./components";

const QuicklinkPageDropdown = ({
  graphPagesData,
  value,
  onChange,
}: {
  graphPagesData: Record<string, string>;
  value: string;
  onChange: (value: string) => void;
}) => {
  const [searchText, setSearchText] = useState("");
  const tokens = tokenizeQuery(searchText);
  const normalizedQuery = normalizeForSearch(searchText);

  const filteredPages = useMemo(() => {
    const entries = Object.entries(graphPagesData);
    const matched = entries.filter(([, nodeTitle]) => matchesTokens(normalizeForSearch(nodeTitle), tokens));
    if (!searchText) return matched.slice(0, 100);
    return matched
      .map(([uid, title]) => [uid, title, rankMatch(normalizeForSearch(title), normalizedQuery)] as const)
      .sort((a, b) => a[2] - b[2])
      .slice(0, 100)
      .map(([uid, title]) => [uid, title] as [string, string]);
  }, [graphPagesData, tokens.join(" "), normalizedQuery]); // eslint-disable-line

  return (
    <Form.Dropdown
      id="graphPageDropdown"
      title="Specific Page?"
      value={value}
      onChange={onChange}
      filtering={false}
      onSearchTextChange={setSearchText}
    >
      <Form.Dropdown.Item key="dailyNotesPage" value="" title="Daily Notes Page (default)" />
      {filteredPages.map(([blockUid, nodeTitle]) => (
        <Form.Dropdown.Item key={blockUid} value={blockUid} title={nodeTitle} />
      ))}
    </Form.Dropdown>
  );
};

export default function CreateGraphQuicklink() {
  const preferences = getPreferenceValues<Preferences>();

  const [graphNameDropdownValue, setGraphNameDropdownValue] = useState<string>("");

  const [graphPageDropdownValue, setGraphPageDropdownValue] = useState<string>("");

  const [showTextBoxForGraphName, setShowTextBoxForGraphName] = useState<boolean>(false);
  const [graphNameTextFieldValue, setGraphNameTextFieldValue] = useState<string>("");

  const [openInDropdownValue, setOpenInDropdownValue] = useState<string>(preferences.openIn || "web");

  const { graphsConfig, isGraphsConfigLoading, orderedGraphNames } = useGraphsConfig();
  const graphNames = orderedGraphNames;

  const firstGraphName = useMemo(() => (graphNames.length > 0 ? graphNames[0] : ""), [graphNames[0]]);

  useEffect(() => {
    if (!isGraphsConfigLoading && !graphNameDropdownValue && firstGraphName) {
      setGraphNameDropdownValue(firstGraphName);
    }
  }, [isGraphsConfigLoading, firstGraphName]);

  const { isLoading: isGraphPagesLoading, data: graphPagesData } = usePromise(
    (graphNameDropdownValue: string) => {
      if (!graphNameDropdownValue || graphNameDropdownValue === "useGraphNameTextField") {
        return Promise.resolve(null);
      } else if (graphsConfig[graphNameDropdownValue]?.capabilities?.read === false) {
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
        <QuicklinkPageDropdown
          graphPagesData={graphPagesData}
          value={graphPageDropdownValue}
          onChange={setGraphPageDropdownValue}
        />
      )}
    </Form>
  );
}
