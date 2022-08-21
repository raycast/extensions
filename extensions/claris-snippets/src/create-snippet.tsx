import { useEffect, useState } from "react";
import { Clipboard, Detail, Form } from "@raycast/api";
import { runAppleScriptSync } from "run-applescript";
import { FMObjectsToXML } from "./utils/FmClipTools";
import CreateError from "./components/create-snippet-error";

// const script = FMObjectsToXML();
export default function Command() {
  const [createState, setCreateState] = useState<"init" | "clipboardError" | "clipboardSuccess" | "form">("init");
  const [snippet, setSnippet] = useState("");
  const createSnippet = async () => {
    setCreateState("init");

    try {
      const res = await FMObjectsToXML();
      console.log({ res });
      setCreateState("clipboardSuccess");
      setSnippet(res ?? "");
    } catch (e) {
      setCreateState("clipboardError");
      console.error("Could not create snippet");
    }
  };
  useEffect(() => {
    createSnippet();
  }, []);

  if (createState === "clipboardError") return <CreateError actionProps={{ onAction: createSnippet }} />;
  if (createState === "clipboardSuccess") return <Detail markdown={snippet} />;

  return (
    <Form isLoading={createState === "init"}>
      <Form.TextField id="name" title="Name" />
    </Form>
  );
}
