import React, { useState } from "react";
import process from "process";
import { ActionPanel, Form, Action, Cache, open } from "@raycast/api";

import { loadTamplate, fillin, VecationData } from "./docs";

const cache = new Cache();

const content = loadTamplate();
const today = new Date();

const vd: VecationData = {
    name: "",
    position: "",
    reason: "",
    start_year: today.getFullYear(),
    start_month: today.getMonth() + 1,
    start_day: today.getDate(),
    end_year: today.getFullYear(),
    end_month: today.getMonth() + 1,
    end_day: today.getDate(),
    period: 0,
    phone_number: "01012345678",
    submit_year: 2023,
    submit_month: 4,
    submit_day: 1,
    image: "signature.png",
};

export default function Command() {
    let start_date = new Date();
    let end_date = new Date();

    const cached_name = cache.get("name");
    const cached_position = cache.get("position");
    const cached_reason = cache.get("reason");
    const cached_sign = cache.get("sign");
    const cached_phone = cache.get("phone");
    const [period, setPeriod] = useState("연차(0일간)");

    const getDateDiff = (start: Date, end: Date) => {
        const oneDay = 1000 * 60 * 60 * 24;
        const diffInTime = end.getTime() - start.getTime();
        const diffInDays = Math.round(diffInTime / oneDay);
        return `연차 (${diffInDays.toString()}일간)`;
    };

    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm
                        title="Submit Name"
                        onSubmit={(values) => {
                            vd.name = values["name"];
                            vd.position = values["position"];
                            vd.reason = values["reason"];
                            vd.start_year =
                                values["dateOfStartVecation"].getFullYear();
                            vd.start_month =
                                values["dateOfStartVecation"].getMonth() + 1;
                            vd.start_day =
                                values["dateOfStartVecation"].getDate();
                            vd.end_year =
                                values["dateOfEndVecation"].getFullYear();
                            vd.end_month =
                                values["dateOfEndVecation"].getMonth() + 1;
                            vd.end_day = values["dateOfEndVecation"].getDate();
                            vd.period = values["period"];
                            vd.phone_number = values["phone"];
                            vd.submit_year =
                                values["dateOfSubmit"].getFullYear();
                            vd.submit_month =
                                values["dateOfSubmit"].getMonth() + 1;
                            vd.submit_day = values["dateOfSubmit"].getDate();
                            vd.image = values["signature"][0];
                            fillin(
                                content,
                                vd,
                                `${process.env.HOME}/Documents`
                            );
                            open(`${process.env.HOME}/Documents/output.docx`);
                        }}
                    />
                </ActionPanel>
            }
        >
            <Form.TextField
                id="name"
                title="Name"
                defaultValue={cached_name || ""}
                onBlur={(event) => {
                    if (event.target.value) {
                        cache.set("name", event.target.value);
                    }
                }}
            />
            <Form.Dropdown
                id="position"
                title="Position"
                defaultValue={cached_position || ""}
                onBlur={(event) => {
                    if (event.target.value) {
                        cache.set("position", event.target.value);
                    }
                }}
            >
                <Form.Dropdown.Item title="연구원" value="연구원" />
                <Form.Dropdown.Item title="선임연구원" value="선임연구원" />
                <Form.Dropdown.Item title="책임연구원" value="책임연구원" />
                <Form.Dropdown.Item title="수석연구원" value="수석연구원" />
            </Form.Dropdown>
            <Form.TextArea
                id="reason"
                title="Reason"
                placeholder="개인사유"
                defaultValue={cached_reason || ""}
                onBlur={(event) => {
                    if (event.target.value) {
                        cache.set("reason", event.target.value);
                    }
                }}
            />
            <Form.FilePicker
                id="signature"
                title="Sign Image"
                allowMultipleSelection={false}
                defaultValue={[cached_sign || ""]}
                onChange={(values) => {
                    cache.set("sign", values[0]);
                }}
            />
            <Form.TextField
                id="phone"
                placeholder="010-1234-5678"
                title="Phone"
                defaultValue={cached_phone || ""}
                onBlur={(event) => {
                    if (event.target.value) {
                        cache.set("phone", event.target.value);
                    }
                }}
            />
            <Form.DatePicker
                id="dateOfStartVecation"
                title="Date of Start Vecation"
                defaultValue={new Date()}
                onChange={(date) => {
                    if (date !== null) {
                        start_date = date;
                    }
                    setPeriod(getDateDiff(start_date, end_date));
                }}
            />
            <Form.DatePicker
                id="dateOfEndVecation"
                title="Date of End Vecation"
                defaultValue={new Date()}
                onChange={(date) => {
                    if (date !== null) {
                        end_date = date;
                    }
                    setPeriod(getDateDiff(start_date, end_date));
                }}
            />
            <Form.DatePicker
                id="dateOfSubmit"
                title="Date of Submit"
                defaultValue={new Date()}
                info="제출 일자로 기입될 날짜"
            />
            <Form.Dropdown id="period" title="Period">
                <Form.Dropdown.Item title={period} value={period} />
                <Form.Dropdown.Item title="반차" value="0.5" />
                <Form.Dropdown.Item title="반반차" value="0.25" />
            </Form.Dropdown>
        </Form>
    );
}
