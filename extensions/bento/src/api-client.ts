import axios from 'axios';
import { getPreferenceValues } from "@raycast/api";


interface Preferences {
    siteUuid: string;
    username: string;
    password: string;
}

const preferences = getPreferenceValues<Preferences>();

const apiClient = axios.create({
    baseURL: 'https://app.bentonow.com/api/v1',
    auth: {
        username: preferences.username,
        password: preferences.password,
    },
    headers: {
        'User-Agent': `bento-raycast-${preferences.siteUuid}`
    }
});

export interface Subscriber {
    uuid: string;
    email: string;
    fields: Record<string, string>;
    cached_tag_ids: string[];
    unsubscribed_at: string | null;
    navigation_url: string;
}


export interface Broadcast {
    id: string;
    name: string;
    share_url: string;
    template: {
        subject: string;
        to: string;
        html: string;
    };
    created_at: string;
    sent_final_batch_at: string | null;
    send_at: string | null;
    stats: {
        open_rate: number;
    };
}

export interface Tag {
    id: string;
    name: string;
    created_at: string;
    discarded_at: string | null;
}

export interface Field {
    id: string;
    name: string;
    key: string;
    whitelisted: string;
    created_at: string;
}

export interface SiteStats {
    user_count: number;
    subscriber_count: number;
    unsubscriber_count: number;
}

export const getSubscribers = async (): Promise<Subscriber[]> => {
    const response = await apiClient.get('/fetch/subscribers', {
        params: { site_uuid: preferences.siteUuid },
    });
    return response.data.data.map((item: any) => item.attributes);
};

export const createSubscriber = async (email: string): Promise<Subscriber> => {
    const response = await apiClient.post('/fetch/subscribers', {
        subscriber: { email },
        site_uuid: preferences.siteUuid,
    });
    return response.data.data.attributes;
};

export const getBroadcasts = async (): Promise<Broadcast[]> => {
    const response = await apiClient.get('/fetch/broadcasts', {
        params: { site_uuid: preferences.siteUuid },
    });
    return response.data.data.map((item: any) => item.attributes);
};

export const getTags = async (): Promise<Tag[]> => {
    const response = await apiClient.get('/fetch/tags', {
        params: { site_uuid: preferences.siteUuid },
    });
    return response.data.data.map((item: any) => item.attributes);
};

export const getFields = async (): Promise<Field[]> => {
    const response = await apiClient.get('/fetch/fields', {
        params: { site_uuid: preferences.siteUuid },
    });
    return response.data.data.map((item: any) => item.attributes);
};

export const getSiteStats = async (): Promise<SiteStats> => {
    const response = await apiClient.get('/stats/site', {
        params: { site_uuid: preferences.siteUuid },
    });
    return response.data;
};

export interface ReportData {
    data: Array<{
        x: string; // Date string
        y: number;
        g: string;
    }>;
    chart_style: string;
    report_type: string;
    report_name: string;
}


export const getReport = async (reportId: string): Promise<ReportData> => {
    console.log("API Client: Fetching report with ID:", reportId);
    const response = await apiClient.get('/stats/report', {
        params: {
            site_uuid: preferences.siteUuid,
            report_id: reportId
        },
    });
    console.log("API Client: Received response:", JSON.stringify(response.data, null, 2));
    return response.data;
};

export const getMultipleReports = async (reportIds: string[]): Promise<ReportData[]> => {
    const preferences = getPreferenceValues();
    const promises = reportIds.map(reportId =>
        apiClient.get('/stats/report', {
            params: {
                site_uuid: preferences.siteUuid,
                report_id: reportId
            },
        })
    );

    const responses = await Promise.all(promises);
    return responses.map(response => response.data);
};

export const checkBlacklist = async (domain?: string, ip?: string): Promise<any> => {
    const params: any = { site_uuid: preferences.siteUuid };
    if (domain) params.domain = domain;
    if (ip) params.ip = ip;
    const response = await apiClient.get('/experimental/blacklist.json', { params });
    return response.data;
};

export const validateEmail = async (email: string, name?: string, userAgent?: string, ip?: string): Promise<any> => {
    const params: any = { site_uuid: preferences.siteUuid, email };
    if (name) params.name = name;
    if (userAgent) params.user_agent = userAgent;
    if (ip) params.ip = ip;
    const response = await apiClient.post('/experimental/validation', null, { params });
    return response.data;
};

export const moderateContent = async (content: string): Promise<any> => {
    const params = { site_uuid: preferences.siteUuid, content };
    const response = await apiClient.post('/experimental/content_moderation', null, { params });
    return response.data;
};

export const guessGender = async (name: string): Promise<any> => {
    const params = { site_uuid: preferences.siteUuid, name };
    const response = await apiClient.post('/experimental/gender', null, { params });
    return response.data;
};

export const geolocateIp = async (ip: string): Promise<any> => {
    const params = { site_uuid: preferences.siteUuid, ip };
    const response = await apiClient.get('/experimental/geolocation', { params });
    return response.data;
};