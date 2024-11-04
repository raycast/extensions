import { ActionPanel, List, Action, showToast, Toast, useNavigation, Form } from "@raycast/api";
import { getSelectedFinderItems } from "@raycast/api";
import { useEffect, useState } from "react";
import { danmuGenerator, manualMatch, danmuGeneratorWithID, manualSearch } from "./utils/danmuGenerator";
import path from "path";

export default function Command() {
  const [items, setItems] = useState<
    {
      path: string;
      status: string;
      completed: boolean;
      needManualMatch: boolean;
      nfoTitle: string;
      ids: string[];
      titles: string[];
    }[]
  >([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // update error message
  const { push } = useNavigation();
  const { pop } = useNavigation();
  useEffect(() => {
    const fetchPaths = async () => {
      try {
        const selectedItems = await getSelectedFinderItems();
        const validItems = selectedItems
          .map((item) => ({
            path: item.path, // only keep file name
            status: "",
            completed: false,
            needManualMatch: false,
            nfoTitle: "",
            ids: [],
            titles: [],
          }))
          .filter((item) => item.path.endsWith(".mp4") || item.path.endsWith(".mkv"));
        setItems(validItems);
      } catch (error) {
        setErrorMessage("Cannot find files"); // update error message
      }
    };

    fetchPaths();
  }, []);

  const handleGenerateDanmu = async (index: number) => {
    if (items[index].completed) return;
    const newItems = [...items];
    newItems[index].status = "Generating Danmu...";
    setItems(newItems); // update status

    try {
      const data = await danmuGenerator(newItems[index].path);
      if (data[0] === true) {
        newItems[index].status = "Danmu Generation Completed! " + data[3] + " Danmu Loaded";
        newItems[index].completed = true;
      } else {
        newItems[index].status = "Manual Select in Danmu Pool";
        newItems[index].needManualMatch = true;
        newItems[index].nfoTitle = data[3];

        newItems[index].titles = Array.isArray(data[1]) ? data[1] : [];
        newItems[index].ids = Array.isArray(data[2]) ? data[2] : [];
      }
    } catch (error) {
      newItems[index].status = "Danmu Generation Failed";
      setErrorMessage(`Fail: ${String(error)}`);
    }

    setItems([...newItems]);
  };

  const handleGenerateDanmuWithIDInput = async (index: number) => {
    push(
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Match with ID"
              onSubmit={(values) => handleGenerateDanmuWithID(index, values["ID"])}
            />
          </ActionPanel>
        }
      >
        <Form.TextArea id="ID" defaultValue="" />
      </Form>,
    );
  };

  const handleGenerateDanmuWithID = async (index: number, episodeID: string) => {
    pop();
    const newItems = [...items];
    newItems[index].status = "Generating Danmu...";
    setItems(newItems);
    try {
      const data = await danmuGeneratorWithID(episodeID, newItems[index].path);
      if (data[0] === true) {
        newItems[index].status = "Danmu Generation Completed! " + data[1] + " Danmu Loaded";
        newItems[index].completed = true;
      } else {
        newItems[index].status = "Danmu Generation Failed";
      }
    } catch (error) {
      newItems[index].status = "Danmu Generation Failed";
      setErrorMessage(`Fail: ${String(error)}`);
    }

    setItems([...newItems]);
  };

  const handleManualMatch = (index: number) => {
    const item = items[index];
    const newItems = [...items];
    if (!Array.isArray(item.ids) || !Array.isArray(item.titles)) {
      showToast(Toast.Style.Failure, "Cannot Find Matched ID and Title");
      return;
    }

    push(
      <List>
        <List.Item
          title={item.nfoTitle} // show nfoTitle
          subtitle="Title Extracted from NFO" // prompt user to select
          icon="title1.png"
        />
        {item.ids.map((id, i) => (
          <List.Item
            key={i}
            title={item.titles[i]}
            subtitle={`ID: ${id}`}
            icon="dot.png"
            actions={
              <ActionPanel>
                <Action
                  title={`Select ${item.titles[i]}`}
                  onAction={async () => {
                    await manualMatch(id, item.path);
                    newItems[index].needManualMatch = false;
                    showToast(Toast.Style.Success, `Selected ${item.titles[i]}`);
                    handleGenerateDanmu(index);
                    pop();
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List>,
    );
  };

  const handleManualSearch = async (index: number) => {
    const item = items[index];
    const newItems = [...items];
    newItems[index].status = "Searching Danmu Pool...";
    setItems(newItems);
    const data = await manualSearch(item.path);
    newItems[index].nfoTitle = data[2];

    newItems[index].ids = Array.isArray(data[1][1]) ? data[1][1] : [];
    newItems[index].titles = Array.isArray(data[1][0]) ? data[1][0] : [];

    if (!Array.isArray(item.ids) || !Array.isArray(item.titles)) {
      showToast(Toast.Style.Failure, "Cannot Find Matched ID and Title");
      return;
    }

    push(
      <List>
        <List.Item
          title={item.nfoTitle} // Show nfoTitle
          subtitle="Title Extracted from NFO" // 提示用户选择
          icon="title1.png"
        />
        {item.ids.map((id, i) => (
          <List.Item
            key={i}
            title={item.titles[i]}
            subtitle={`ID: ${id}`}
            icon="dot.png"
            actions={
              <ActionPanel>
                <Action
                  title={`Select ${item.titles[i]}`}
                  onAction={async () => {
                    showToast(Toast.Style.Success, `Selected ${item.titles[i]}`);
                    handleGenerateDanmuWithID(index, id);
                    pop();
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List>,
    );
  };

  const clearErrorMessage = () => {
    setErrorMessage(null);
  };

  return (
    <List isLoading={items.length === 0}>
      {errorMessage && (
        <List.Item
          title="Error"
          subtitle={errorMessage}
          actions={
            <ActionPanel>
              <Action title="Close" onAction={clearErrorMessage} />
            </ActionPanel>
          }
        />
      )}
      {items.map((item, index) => (
        <List.Item
          key={index}
          icon={item.completed ? "done1.png" : "dot.png"}
          title={path.basename(item.path)}
          subtitle={item.status}
          actions={
            <ActionPanel>
              {item.needManualMatch ? (
                <Action title="Details" onAction={() => handleManualMatch(index)} />
              ) : (
                <>
                  {item.completed ? null : (
                    <Action title="Generate Danmu" onAction={() => handleGenerateDanmu(index)} />
                  )}
                  <Action title="Manual Search ID" onAction={() => handleManualSearch(index)} />
                  <Action title="Manual Assign ID" onAction={() => handleGenerateDanmuWithIDInput(index)} />
                </>
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
