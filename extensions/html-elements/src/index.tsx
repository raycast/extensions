import { List, ActionPanel, Action, Detail } from "@raycast/api";
import { useState, useEffect } from "react";
import { ElementDetails, fetchHtmlElements } from "./fetch-html-elements";

export default function SearchHTMLElements() {
  const [elements, setElements] = useState<ElementDetails[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [selectedElement, setSelectedElement] = useState<ElementDetails | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);

  useEffect(() => {
    const fetchElements = async () => {
      if (searchText) {
        setIsInitialLoad(false);
        const results = await fetchHtmlElements(searchText);
        setElements(results);
      }
    };
    fetchElements();
  }, [searchText]);

  const handleSelectionChange = (id: string | null) => {
    const selected = elements.find((element) => element.title === id);
    if (selected) {
      setSelectedElement(selected);
    }
  };

  if (selectedElement) {
    return <ElementDetailsView element={selectedElement} onBack={() => setSelectedElement(null)} />;
  }

  return (
    <List
      onSearchTextChange={setSearchText}
      onSelectionChange={handleSelectionChange}
      isLoading={!isInitialLoad && elements.length === 0}
    >
      {elements.map((element) => (
        <List.Item
          key={element.title}
          title={element.title}
          subtitle={element.summary}
          accessories={[{ text: element.mdn_url }]}
          actions={
            <ActionPanel>
              <Action title="Read Docs" onAction={() => setSelectedElement(element)} />
              <Action.OpenInBrowser
                title="Open in Browser"
                url={element.mdn_url}
                shortcut={{ modifiers: ["cmd"], key: "enter" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

type ElementDetailsViewProps = {
  element: ElementDetails;
  onBack: () => void;
};

export const ElementDetailsView: React.FC<ElementDetailsViewProps> = ({ element, onBack }) => {
  return (
    <Detail
      markdown={`# ${element.title}\n\n${element.summary}`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={element.mdn_url} />
          <Action title="Go Back" onAction={onBack} />
        </ActionPanel>
      }
    />
  );
};
