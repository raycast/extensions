import { open, showToast, Toast } from "@raycast/api";
import { parse, ParserError } from "@asyncapi/parser";

export const AsyncAPIDocumentExample = `asyncapi: '2.3.0'
info:
  title: Account Service
  version: 1.0.0
  description: This service is in charge of processing user signups
channels:
  user/signedup:
    subscribe:
      message:
        $ref: '#/components/messages/UserSignedUp'
components:
  messages:
    UserSignedUp:
      payload:
        type: object
        properties:
          displayName:
            type: string
            description: Name of the user
          email:
            type: string
            format: email
            description: Email of the user
`;

export async function openStudio(document: string) {
  const encoded = Buffer.from(document).toString("base64");
  await open("https://studio.asyncapi.com/?base64=" + encoded);
}

export async function validateAsyncAPIDocument(document: string) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Validating your AsyncAPI document...",
    primaryAction: {
      title: "Open in AsyncAPI Studio",
      onAction: () => {
        openStudio(document).then(() => {
          toast.hide();
        });
      },
    },
  });

  try {
    await parse(document);
    toast.style = Toast.Style.Success;
    toast.title = "Your AsyncAPI document is valid";
  } catch (err) {
    toast.style = Toast.Style.Failure;
    if (err instanceof ParserError) {
      if ((err as any).type === "https://github.com/asyncapi/parser-js/validation-errors") {
        toast.title = (err as any).title;
        toast.message = `ERRORS:\n${JSON.stringify((err as any).validationErrors)}`;
      } else {
        toast.title = "Your AsyncAPI document is invalid";
        toast.message = (err as any).title;
      }
    } else {
      toast.title = "Your AsyncAPI document is invalid";
    }

    return;
  }
}
