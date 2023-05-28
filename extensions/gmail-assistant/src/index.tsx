import { ActionPanel, Form, Action, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getService, SendMail } from "./lib/types";

export default function Command() {
  const service = getService("google");
  const [isLoading, setIsLoading] = useState(true);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  function dropEmailErrorIfNeeded() {
    if (emailError && emailError.length > 0) {
      setEmailError(undefined);
    }
  }

  function validateEmail(email: string): boolean {
    // Regular expression pattern to match email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Use the test() method of the regular expression to check if the email matches the pattern
    return emailPattern.test(email);
  }

  useEffect(() => {
    (async () => {
      try {
        await service.authorize();
        setIsLoading(false);
      } catch (error) {
        console.log(error);
        setIsLoading(true);
        showToast({ style: Toast.Style.Failure, title: "Check your network connection" });
      }
    })();
  }, []);

  const handelSend = async (toDraft: boolean) => {
    try {
      const values: SendMail = {
        to,
        subject,
        body,
      };

      const res = await service.sendEmail(values, toDraft);
      // console.log("submit:", res);
      // console.log(typeof res);
      if (typeof res === "string") {
        // console.log("test");
        showToast({ style: Toast.Style.Success, title: "Mail sent" });
        setSubject("");
        setBody("");
        return;
      }
      showToast({ style: Toast.Style.Failure, title: "Failed to send" });
    } catch (error) {
      console.log("Error sending email");
      console.error(error);
      showToast({ style: Toast.Style.Failure, title: "Failed to send the mail check your network connection" });
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send" onSubmit={() => handelSend(false)} />
          <Action title="Send to Draft" onAction={() => handelSend(true)} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="to"
        title="To"
        placeholder="To"
        autoFocus
        info="To address"
        error={emailError}
        value={to}
        onChange={(value) => {
          setTo(value);
          dropEmailErrorIfNeeded();
        }}
        onBlur={() => {
          if (to.length === 0) {
            setEmailError("The field shouldn't be empty!");
          } else if (!validateEmail(to)) {
            setEmailError("Not a valid Email");
          } else {
            dropEmailErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        id="subject"
        title="Subject"
        placeholder="Subject"
        info="Subject"
        value={subject}
        onChange={(value) => setSubject(value)}
      />
      <Form.TextArea
        title="Content"
        id="body"
        placeholder="Body"
        info="Body"
        value={body}
        onChange={(value) => setBody(value)}
      />
    </Form>
  );
}
