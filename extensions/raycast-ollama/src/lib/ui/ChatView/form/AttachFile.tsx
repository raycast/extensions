import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { Document } from "langchain/document";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import mime from "mime-types";

interface FormData {
  file: string[];
}

interface props {
  SetShow: React.Dispatch<React.SetStateAction<boolean>>;
  SetDocument: React.Dispatch<React.SetStateAction<Document<Record<string, any>>[] | undefined>>;
  Document?: Document<Record<string, any>>[];
}

export function FormAttachFile(props: props): JSX.Element {
  const { handleSubmit, itemProps } = useForm<FormData>({
    async onSubmit(values) {
      await SetDocument(values);
      props.SetShow(false);
    },
    initialValues: {
      file: props.Document && props.Document.map((d) => d.metadata.source).filter((d) => d !== undefined),
    },
    validation: {
      file: ValidateFiles,
    },
  });

  const infoFiles = `Following file types are supported:
- Text-Based
- PDF
- DOCX`;

  function ValidateFiles(values: string[] | undefined): string | undefined {
    if (!values) return "The item is required";
    const supportedTypes = [
      "text/*",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.(?:(?:wordprocessingml.document))",
    ];
    const error = values
      .map((file) => {
        const fileType = mime.lookup(file);
        if (!fileType) return `Can't evaluate file type for "${file}"`;
        if (!supportedTypes.find((v) => fileType.match(v)))
          return `Remove "${file}" from selected file, file type "${fileType}" unsupported`;
      })
      .filter((v) => v !== undefined);
    if (error.length > 0) return error[0];
  }

  async function SetDocument(values: FormData): Promise<void> {
    if (values.file.length === 0) {
      props.SetDocument(undefined);
      return;
    }

    const dm = await Promise.all(
      values.file.map((f) => {
        const m = mime.lookup(f);
        if (!m) return undefined;
        if (m.match(/text\/*/)) {
          const l = new TextLoader(f);
          return l.load().catch(() => undefined);
        }
        if (m.match(/application\/pdf/)) {
          const l = new PDFLoader(f);
          return l.load().catch(() => undefined);
        }
        if (m.match(/application\/vnd.openxmlformats-officedocument.wordprocessingml.document/)) {
          const l = new DocxLoader(f);
          return l.load().catch(() => undefined);
        }
      })
    );
    const d: Document<Record<string, any>>[] = [];
    for (const document1 of dm) if (document1) for (const document2 of document1) d.push(document2);
    if (d.length === 0) {
      props.SetDocument(undefined);
      return;
    }
    props.SetDocument(d);
  }

  const ActionView = (
    <ActionPanel>
      <Action.SubmitForm onSubmit={handleSubmit} />
      <Action title="Close" icon={Icon.Xmark} onAction={() => props.SetShow(false)} />
    </ActionPanel>
  );

  return (
    <Form actions={ActionView}>
      <Form.FilePicker info={infoFiles} {...itemProps.file} />
    </Form>
  );
}
