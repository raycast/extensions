import { Action, ActionPanel, Form, Icon, Keyboard, useNavigation } from "@raycast/api";
import { Browser, Notebook } from "../types";
import { formatNavigationTitle } from "../utils/transformData";
import { NotebookService } from "../services";
import { ArcTabList, OthersTabList } from "./TabList";

export function SelectSource(props: {
  notebookService: NotebookService;
  notebook: Notebook | null;
  shortcut?: Keyboard.Shortcut;
}) {
  const { notebookService, notebook, shortcut } = props;
  const title = notebook ? "Add Source" : "Create New Notebook";

  return (
    <ActionPanel.Submenu title={title} icon={Icon.Plus} shortcut={shortcut}>
      <Action.Push
        title="Paste Text"
        icon={Icon.Text}
        target={<PasteText notebookService={notebookService} notebook={notebook} />}
      />
      <Action.Push
        title="Add Tabs"
        icon={Icon.Link}
        target={
          Browser === "Arc" ? (
            <ArcTabList notebookService={notebookService} notebook={notebook} />
          ) : (
            <OthersTabList notebookService={notebookService} notebook={notebook} />
          )
        }
      />
    </ActionPanel.Submenu>
  );
}

function PasteText(props: { notebookService: NotebookService; notebook: Notebook | null }) {
  const { notebookService, notebook } = props;
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={`Add Text in ${formatNavigationTitle(notebook)}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit"
            onSubmit={async (values) => {
              pop();
              notebookService.addPasteText(values.text, notebook?.id);
              // console.log(await notebookService.getNewSourceId())
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="text" title="Text" placeholder="Paste text here..." />
    </Form>
  );
}
