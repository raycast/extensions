import { ActionPanel, Form, Action } from "@raycast/api";
import { useState, useMemo } from "react";

const HTTP_REGEX = /^(http|https|ftp):\/\/[^\s]+/;
const MAGNET_REGEX = /^magnet:\?xt=urn:btih:[a-f0-9]{40,}/;

function CreateTaskForm() {
  const PLACEHOLDER_LINKS = `magnet:?xt=urn:btih:xxxxxxxxxxxxxx
http://example.com/file.zip
ftp://example.com/files/document.pdf
...`;

  const [taskLinkArray, setTaskLinkArray] = useState<string[]>([
    "magnet:?xt=urn:btih:cab53546444eac30036a1e0befd5b57982b2e3ad",
  ]);
  const [error, setError] = useState<string | undefined>(undefined);

  const handleChange = (newValue: string) => {
    const links = newValue.split("\n");
    setTaskLinkArray(links);
    const invalidLinks = validateLinks(links);
    if (invalidLinks.length === 0) {
      setError(undefined);
    } else {
      const errorLines = invalidLinks.join(", ");
      const errorMessage = `Invalid links at lines: ${errorLines}`;
      setError(errorMessage);
    }
  };

  const handleSubmit = () => {
    const invalidLinks = validateLinks(taskLinkArray);
    if (invalidLinks.length === 0) {
      setTaskLinkArray([]);
    } else {
      const errorLines = invalidLinks.join(", ");
      const errorMessage = `Invalid links at lines: ${errorLines}`;
      setError(errorMessage);
    }
  };

  const validateLinks = (links: string[]) => {
    const invalidLinks = [];
    for (let i = 0; i < links.length; i++) {
      const trimmedLink = links[i].trim();
      if (!(HTTP_REGEX.test(trimmedLink) || MAGNET_REGEX.test(trimmedLink))) {
        invalidLinks.push(i + 1); // store the line number of the invalid link
      }
    }
    return invalidLinks;
  };

  const calculateLineCount = (text: string) => {
    if (!text.trim()) {
      return 0;
    }
    const lines = text.split("\n");
    return lines.length;
  };

  const linkCount = useMemo(() => calculateLineCount(taskLinkArray.join("\n")), [taskLinkArray]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Description" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="links"
        autoFocus={true}
        title={`Download links (${linkCount} links):`}
        value={taskLinkArray.join("\n")}
        onChange={handleChange}
        placeholder={PLACEHOLDER_LINKS}
        info="Multiple URL addresses are supported, each on a line."
        error={error}
      />
    </Form>
  );
}

export default CreateTaskForm;
