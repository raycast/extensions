import { defaultPage, Page, PageParams } from "./page";
import { Payload } from "./payload";

export interface Employment {
    id: string;
    status: string;
    type: string;
    country: {
        code: string;
        name: string;
        alpha_2_code: string;
        supported_json_schemas: string[];
    };
    full_name: string;
    department: null;
    job_title: string;
    personal_email: string;
    department_id: null;
}

export function defaultEmployment(employment?: Partial<Employment>): Employment {
    return {
        id: "00000000-0000-0000-0000-000000000000",
        status: "active",
        type: "employee",
        country: {
            code: "DEU",
            name: "Germany",
            alpha_2_code: "DE",
            supported_json_schemas: [
                "administrative_details",
                "employment_basic_information",
                "emergency_contact",
                "address_details",
            ],
        },
        full_name: "Foo Bar",
        department: null,
        job_title: "Some Job",
        department_id: null,
        personal_email: "foo.bar@email.com",
        ...employment,
    };
}

export interface ListEmploymentsParams extends PageParams {
    company_id?: string;
    email?: string;
    status?: string;
}

export type ListEmployments = Page<{ employments: Employment[] }>;
export type ListEmploymentsPayload = Payload<ListEmployments>;

export function defaultEmploymentsPayload(employments?: Partial<Employment>[]): ListEmploymentsPayload {
    return {
        data: {
            employments: employments?.map((_) => defaultEmployment(_)) ?? [defaultEmployment()],
            ...defaultPage(),
        },
    };
}
