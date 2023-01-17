import { Form, ActionPanel, Action, showToast } from "@raycast/api";

type Values = {
    textfield: string;
    textarea: string;
    datepicker: Date;
    checkbox: boolean;
    dropdown: string;
    tokeneditor: string[];
};

export default function Command() {
    function handleSubmit(values: Values) {
        console.log(values);
        showToast({ title: "Submitted form", message: "See logs for submitted values" });
    }

    // TODO: Hook up Trello API to return list of boards by username
    // https://developer.atlassian.com/cloud/trello/rest/api-group-members/#api-members-id-boards-get

    // TODO: Map list of Trello boards to Board dropdown options
    // https://developer.atlassian.com/cloud/trello/rest/api-group-boards/#api-boards-id-lists-get

    // TODO: Use Trello API to get list of lists by board ID 
    // TODO: Map list of selected board to List dropdown options
    // TODO: Create action to post new card in Trello with form data
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
            <Form.TextField id="textfield" title="Card name" placeholder="Enter text" />
            <Form.TextArea id="textarea" title="Card description" placeholder="Enter multi-line text" />
            <Form.DatePicker id="datepicker" title="Due date?" />

            <Form.Dropdown id="dropdown-board" title="Select a board">
                <Form.Dropdown.Item value="dropdown-item" title="Dropdown Item" />
            </Form.Dropdown>
            <Form.Dropdown id="dropdown-list" title="Select a list from that board">
                <Form.Dropdown.Item value="dropdown-item" title="Dropdown Item" />
            </Form.Dropdown>

        </Form>
    );
}
