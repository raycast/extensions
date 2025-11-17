import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { TrelloFetchResponse } from "./trelloResponse.model";
import { returnBoards } from "./utils/fetchBoards";
// import { Board } from "./Board";
import { returnLists } from "./utils/fetchLists";
import { List } from "./List";
import { Member } from "./Member";
// import { TransferListItem } from "worker_threads";
import { postTodo } from "./utils/postTodo";
import { getMembers } from "./utils/getMembers";

// TODO: Consolidate with types?
type Values = {
  name: string;
  desc: string;
  due: Date;
  idBoard: string;
  idList: string;
};

export default function Command() {
  const [boardResults, setBoards] = useState<TrelloFetchResponse>([]);
  const [listResults, setLists] = useState<List[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const currentBoardId = "";

  useEffect(() => {
    async function fetchBoards() {
      try {
        setLoading(true);
        await returnBoards().then((response) => {
          setBoards(response);
          setLoading(false);
        });
      } catch (error) {
        showToast(Toast.Style.Failure, "Failed loading boards");
      }
    }
    fetchBoards();
  }, []);

  async function setSelectedBoard(boardId: string) {
    try {
      setLoading(true);
      const listsResponse = await returnLists(boardId);
      const membersResponse = await getMembers(boardId);
      setLists(listsResponse);
      setMembers(membersResponse);
      setLoading(false);
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed loading boards");
    }
  }

  function handleSubmit(values: Values) {
    postTodo(values);
  }

  // BONUS: If clipboard has a URL inject into card description
  // BONUS: Create option to go to newly created card

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
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
        value={currentBoardId}
        onChange={(val: string) => {
          setSelectedBoard(val);
        }}
      >
        {boardResults?.map((result) => (
          <Form.Dropdown.Item key={result.id} value={result.id.toString()} title={result.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="idList" title="Select a list from that board">
        {listResults?.map((result) => (
          <Form.Dropdown.Item key={result.id} value={result.id.toString()} title={result.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
