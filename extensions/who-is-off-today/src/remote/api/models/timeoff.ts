import { defaultPage, Page, PageParams } from "./page";
import { Payload } from "./payload";

export interface TimeOff {
    id: string;
    status: string;
    timezone: string;
    cancelled_at: string | null;
    automatic: boolean;
    start_date: string;
    notes: string;
    cancel_reason: string | null;
    end_date: string;
    employment_id: string;
    timeoff_type: string;
    timeoff_days: {
        hours: number;
        day: string;
    }[];
    approved_at: string;
    approver_id: string;
}

export function defaultTimeOff(timeOff?: Partial<TimeOff>): TimeOff {
    return {
        id: "00000000-0000-0000-0000-000000000000",
        status: "approved",
        timezone: "Europe/Amsterdam",
        cancelled_at: null,
        automatic: true,
        start_date: "2025-01-23",
        cancel_reason: null,
        notes: "Automatic public holiday",
        end_date: "2024-01-23",
        employment_id: "00000000-0000-0000-0000-000000000000",
        timeoff_type: "public_holiday",
        timeoff_days: [
            {
                hours: 8,
                day: "2024-01-23",
            },
        ],
        approved_at: "2024-05-24T11:07:26Z",
        approver_id: "00000000-0000-0000-0000-000000000000",
        ...timeOff,
    };
}

export interface ListTimeOffParams extends PageParams {
    employment_id?: string;
    timeoff_type?: string;
    status?: string;
    order?: string;
    sort_by?: string;
}

export type ListTimeOffs = Page<{ timeoffs: TimeOff[] }>;
export type ListTimeOffPayload = Payload<ListTimeOffs>;

export function defaultTimeOffsPayload(timeOffs?: Partial<TimeOff>[]): ListTimeOffPayload {
    return {
        data: {
            timeoffs: timeOffs?.map((_) => defaultTimeOff(_)) ?? [defaultTimeOff()],
            ...defaultPage(),
        },
    };
}
