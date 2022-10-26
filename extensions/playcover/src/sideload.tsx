import { Form, ActionPanel, Action, popToRoot, showToast, Toast, showHUD, open, confirmAlert } from "@raycast/api";
import { useSideload } from "./hooks/useSideload";
interface Sideload {
  path: string;
}


export default function Command(props: { draftValues?: Sideload }) {
  const { draftValues } = props;
  //const [isInstalling, setIsInstalling] = useState(false);

  async function handleSubmit(values: Sideload) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Sideload in progress",
    });
    console.log(values.path, "values.path");
    if (values.path) {
      console.log("initiating sideload");
      try {
        toast.show();
        console.log("sideLoading", await useSideload(values.path));
        toast.style = Toast.Style.Success;
        toast.title = "Sideload complete";
        toast.hide()
        await showHUD("Sideload complete");
        if (await confirmAlert({ title: "You need to launch the app manually the first time for the app to work" })) {
          await showHUD("Launching PlayCover")
          open("/Applications/PlayCover.app")
        }
        popToRoot(); 
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.message = "An error has occurred";
        toast.hide()
        console.log("An error has occurred", error);
        popToRoot(); 
      }
      }
    }


  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={async (values: Sideload) => {
              await handleSubmit(values);
            }}
          />
        </ActionPanel>
      }
    >
        <Form.TextField id="path" title="Application Path" defaultValue={draftValues?.path} />
    </Form>
  );
}