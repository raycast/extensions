import { Action, ActionPanel, Detail, Form, Toast, showToast } from "@raycast/api";
import { useState } from "react";

import { useStarLine } from "../context/starline";
import { getErrorMessage } from "../utils/errors";
import { jsonCodeBlock, markdownTable } from "../utils/format";

import type { LibraryEventsResponse } from "../types/starline";
import type { MarkdownRow } from "../utils/format";

function formatEventDescription(data: LibraryEventsResponse) {
    const rows: MarkdownRow[] = (data.eventDescriptions ?? []).map(
        (event): MarkdownRow => [event.code, event.group_id, event.desc],
    );

    return `${markdownTable(["Code", "Group", "Description"], rows)}\n\n## Raw JSON\n\n${jsonCodeBlock(data)}`;
}

function EventDescriptionForm() {
    const starline = useStarLine();
    const [eventId, setEventId] = useState("");
    const [result, setResult] = useState<LibraryEventsResponse | undefined>(undefined);

    const submit = async () => {
        const trimmedId = eventId.trim();
        const parsed = Number(trimmedId);

        if (trimmedId.length === 0 || !Number.isInteger(parsed) || parsed <= 0) {
            await showToast(Toast.Style.Failure, "Invalid Event ID", "Enter a positive integer");
            return;
        }

        try {
            const data = await starline.getEventDescription(parsed);
            setResult(data);
        } catch (error) {
            await showToast(Toast.Style.Failure, "Failed to load event", getErrorMessage(error));
        }
    };

    if (result !== undefined) {
        return <Detail markdown={`# Event ${eventId}\n\n${formatEventDescription(result)}`} />;
    }

    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Load Event Description" onSubmit={submit} />
                </ActionPanel>
            }
        >
            <Form.TextField
                id="eventId"
                title="Event ID"
                placeholder="Enter numeric event ID"
                value={eventId}
                onChange={setEventId}
            />
        </Form>
    );
}

export default EventDescriptionForm;
