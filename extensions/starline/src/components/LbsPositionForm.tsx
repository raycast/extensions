import { Action, ActionPanel, Detail, Form, Toast, showToast } from "@raycast/api";
import { useState } from "react";

import { useStarLine } from "../context/starline";
import { getErrorMessage } from "../utils/errors";
import { displayString, jsonCodeBlock, markdownTable } from "../utils/format";

import type { LbsPositionResponse } from "../types/starline";
import type { MarkdownRow } from "../utils/format";

function formatLbsPosition(data: LbsPositionResponse) {
    const rows: MarkdownRow[] = [
        ["Latitude", displayString(data.gps?.lat)],
        ["Longitude", displayString(data.gps?.lon)],
        ["Radius", displayString(data.gps?.r)],
    ];

    return `${markdownTable(["Field", "Value"], rows)}\n\n## Raw JSON\n\n${jsonCodeBlock(data)}`;
}

function parseRequiredInt(value: string): number | undefined {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
        return undefined;
    }
    const parsed = Number(trimmed);
    return Number.isInteger(parsed) ? parsed : undefined;
}

function parseOptionalInt(value: string): { ok: true; value: number | undefined } | { ok: false } {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
        return { ok: true, value: undefined };
    }
    const parsed = Number(trimmed);
    return Number.isInteger(parsed) ? { ok: true, value: parsed } : { ok: false };
}

function LbsPositionForm() {
    const starline = useStarLine();
    const [mcc, setMcc] = useState("");
    const [mnc, setMnc] = useState("");
    const [lac, setLac] = useState("");
    const [cid, setCid] = useState("");
    const [pwr, setPwr] = useState("");
    const [result, setResult] = useState<LbsPositionResponse | undefined>(undefined);

    const submit = async () => {
        const parsedMcc = parseRequiredInt(mcc);
        const parsedMnc = parseRequiredInt(mnc);
        const parsedLac = parseRequiredInt(lac);
        const parsedCid = parseRequiredInt(cid);
        const parsedPwr = parseOptionalInt(pwr);

        if (parsedMcc === undefined || parsedMnc === undefined || parsedLac === undefined || parsedCid === undefined) {
            await showToast(Toast.Style.Failure, "Invalid Input", "MCC, MNC, LAC, CID must be integers");
            return;
        }

        if (!parsedPwr.ok) {
            await showToast(Toast.Style.Failure, "Invalid PWR", "Power must be an integer if provided");
            return;
        }

        const station = {
            mcc: parsedMcc,
            mnc: parsedMnc,
            lac: parsedLac,
            cid: parsedCid,
            ...(parsedPwr.value !== undefined ? { pwr: parsedPwr.value } : {}),
        };

        try {
            let data: LbsPositionResponse;

            if (parsedPwr.value !== undefined) {
                data = await starline.getLbsPositions({ lbs_data: [station] });
            } else {
                data = await starline.getLbsPosition(station);
            }

            setResult(data);
        } catch (error) {
            await showToast(Toast.Style.Failure, "Failed to get LBS position", getErrorMessage(error));
        }
    };

    if (result !== undefined) {
        return <Detail markdown={`# LBS Position\n\n${formatLbsPosition(result)}`} />;
    }

    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Get LBS Position" onSubmit={submit} />
                </ActionPanel>
            }
        >
            <Form.TextField id="mcc" title="MCC" placeholder="Mobile Country Code" value={mcc} onChange={setMcc} />
            <Form.TextField id="mnc" title="MNC" placeholder="Mobile Network Code" value={mnc} onChange={setMnc} />
            <Form.TextField id="lac" title="LAC" placeholder="Location Area Code" value={lac} onChange={setLac} />
            <Form.TextField id="cid" title="CID" placeholder="Cell ID" value={cid} onChange={setCid} />
            <Form.TextField
                id="pwr"
                title="Power (optional)"
                placeholder="Signal power"
                value={pwr}
                onChange={setPwr}
            />
        </Form>
    );
}

export default LbsPositionForm;
