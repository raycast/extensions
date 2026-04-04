import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { trelloClient } from "./utils/trelloClient";
import { List } from "./List";
import { Member } from "./Member";
import { postCard } from "./utils/postCard";
import { Board } from "./Board";

// TODO: Consolidate with types?
type Values = {
  name: string;
  desc: string;
  due?: Date | null;
  idBoard: string;
  idList: string;
  idMember?: string[];
};

export default function Command() {
  const [boardResults, setBoards] = useState<Board[]>([]);
  const [listResults, setLists] = useState<List[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBoard, setSelectedBoard] = useState<string>("");
  const [selectedList, setSelectedList] = useState<string>("");

  useEffect(() => {
    async function fetchBoards() {
      try {
        setLoading(true);
        const response = await trelloClient.getBoards(false);
        setBoards(response);
        if (response[0]?.id) {
          setSelectedBoard(response[0].id);
          await loadListsAndMembers(response[0].id);
        }
        setLoading(false);
      } catch (error) {
        showToast(Toast.Style.Failure, "Failed loading boards");
        setLoading(false);
      }
    }
    fetchBoards();
  }, []);

  async function loadListsAndMembers(boardId: string) {
    try {
      setLoading(true);
      const listsResponse = await trelloClient.getLists(boardId);
      const membersResponse = await trelloClient.getBoardMembers(boardId);
      setLists(listsResponse);
      setMembers(membersResponse);
      if (listsResponse[0]?.id) setSelectedList(listsResponse[0].id);
      setLoading(false);
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed loading lists");
      setLoading(false);
    }
  }

  function handleSubmit(values: Values) {
    postCard(values);
  }

  // BONUS: If clipboard has a URL inject into card description
  // BONUS: Create option to go to newly created card

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Create card" />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a card in Trello" />
      {/* <Form.Separator /> */}
      <Form.TextField id="name" title="Card name" placeholder="Enter text" />
      <Form.TextArea id="desc" title="Card description" placeholder="Enter multi-line text" />
      <Form.DatePicker id="due" title="Due date" />
      <Form.TagPicker id="idMember" title="Assign to">
        <Form.TagPicker.Item key="unassigned" value="" title="Unassigned" />
        {members.map((member) => (
          <Form.TagPicker.Item key={member.id} value={member.id} title={member.username} />
        ))}
      </Form.TagPicker>

      <Form.Dropdown
        id="idBoard"
        title="Select a board"
        value={selectedBoard}
        onChange={(val: string) => {
          setSelectedBoard(val);
          loadListsAndMembers(val);
        }}
      >
        {boardResults?.map((result) => (
          <Form.Dropdown.Item key={result.id} value={result.id.toString()} title={result.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="idList"
        title="Select a list from that board"
        value={selectedList}
        onChange={(val: string) => setSelectedList(val)}
      >
        {listResults?.map((result) => (
          <Form.Dropdown.Item key={result.id} value={result.id.toString()} title={result.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
