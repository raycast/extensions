export declare const createSlackNotiTemplate: ({ name, email, url, description, tags, }: {
    name: string;
    email: string;
    url: string;
    description: string;
    tags: string[];
}) => ({
    type: string;
    text: {
        type: string;
        text: string;
    };
    elements?: undefined;
} | {
    type: string;
    elements: {
        type: string;
        text: string;
    }[];
    text?: undefined;
} | {
    type: string;
    text?: undefined;
    elements?: undefined;
} | undefined)[];
export declare const sendSlackNotiMessage: ({ blocks }: {
    blocks: any[];
}) => Promise<void>;
